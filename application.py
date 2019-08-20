from app_config import app
from flask import request, render_template, redirect, url_for, session, make_response
from werkzeug.utils import secure_filename
import json
from pathlib import Path
import os
from Code.utility_functions import check_if_empty, excel_to_json, get_excel_row_index, get_excel_column_index, verify_google_login, add_login_source_in_user_id
from Code.handler import highlight_region, resolve_cell, generate_download_file, load_yaml_data, build_item_table, wikifier
from Code.User import User
from Code.ItemTable import ItemTable
from Code.DataFile import DataFile

ALLOWED_EXCEL_FILE_EXTENSIONS = {'xlsx', 'xls', 'csv'}


def allowed_file(filename: str, file_extensions=ALLOWED_EXCEL_FILE_EXTENSIONS):
	"""
	This function checks if the file extension is present in the list of allowed file extensions
	:param filename:
	:param file_extensions:
	:return:
	"""
	return '.' in filename and filename.rsplit('.', 1)[1].lower() in file_extensions


def get_file_extension(filename: str):
	"""
	THis function returns the file extension of a file
	:param filename:
	:return:
	"""
	return filename.split(".")[-1]


def excel_uploader(user: User, sheet_name: str):
	"""
	This function helps in processing the data file
	:param user:
	:param sheet_name:
	:return:
	"""
	user_data = user.get_excel_data()
	data = {"error": ""}
	if sheet_name and not check_if_empty(user_data.get_file_location()):
		file_path = user_data.get_file_location()
		data = excel_to_json(file_path, sheet_name)
		user_data.set_sheet_name(sheet_name)
	else:
		if 'file' not in request.files:
			data["error"] = 'No file part'
		else:
			file = request.files['file']
			if file.filename == '':
				data["error"] = 'No file selected for uploading'
			if file and allowed_file(file.filename):
				filename = secure_filename(file.filename)
				filename = user.get_user_id() + "_excel_file." + get_file_extension(filename)
				file_path = str(Path(app.config['UPLOAD_FOLDER']) / filename)
				file.save(file_path)
				data = excel_to_json(file_path, sheet_name)
				if not sheet_name:
					try:
						sheet_name = data['sheetNames'][0]
					except KeyError:
						sheet_name = None
				user_data.set_file_location(file_path)
				user_data.set_sheet_name(sheet_name)
			else:
				data["error"] = 'This file type is currently not supported'
	return data


def wikified_output_uploader(user: User):
	"""
	This function helps in processing the wikifier output file
	:param user:
	:return:
	"""
	user_data = user.get_wikifier_output_data()
	data = {"error": ""}
	if 'wikifier_output' not in request.files:
		data["error"] = 'No file part'
	else:
		file = request.files['wikifier_output']
		if file.filename == '':
			data["error"] = 'No file selected for uploading'
		if file and allowed_file(file.filename, "csv"):
			filename = secure_filename(file.filename)
			filename = user.get_user_id() + "." + get_file_extension(filename)
			file_path = str(Path(app.config['UPLOAD_FOLDER']) / filename)
			file.save(file_path)
			user_data.set_file_location(file_path)
		else:
			data["error"] = 'This file type is currently not supported'
	return data


@app.route('/')
def index():
	"""
	This functions renders the GUI
	:return:
	"""
	if 'uid' in session:
		return redirect(url_for('project_home'))
	else:
		return render_template('login.html')


@app.route('/upload_excel', methods=['POST'])
def upload_excel():
	"""
	This function uploads the data file
	:return:
	"""
	if 'uid' in session:
		user_id = session['uid']
		project_id = request.form['pid']
		is_new_upload = bool(request.form["is_new_upload"])
		user = app.config['USER_STORE'].get_user(user_id)
		sheet_name = request.form.get("sheet_name")
		project = user.get_project(project_id)

		project.reset('yaml')
		if is_new_upload:
			data_file = DataFile()
			project.index_data_file(data_file)
			user.reset('excel')
			user.get_wikifier_output_data().reset()
		user.get_wikifier_output_data().reset_item_table()
		os.makedirs("uploads", exist_ok=True)
		response = excel_uploader(user, sheet_name)
		excel_data_filepath = user.get_excel_data().get_file_location()
		wikifier_output_filepath = user.get_wikifier_output_data().get_file_location()
		if excel_data_filepath and excel_data_filepath and wikifier_output_filepath:
			item_table = user.get_wikifier_output_data().get_item_table()
			if not item_table:
				item_table = ItemTable()
				user.get_wikifier_output_data().set_item_table(item_table)
			build_item_table(item_table, wikifier_output_filepath, excel_data_filepath, sheet_name)
			response.update(item_table.get_region_qnodes())

		return json.dumps(response, indent=3)
	else:
		return redirect(url_for('index'))


@app.route('/upload_yaml', methods=['POST'])
def upload_yaml():
	"""
	This function process the yaml
	:return:
	"""
	user_id = request.form["id"]
	yaml_data = request.values["yaml"]

	os.makedirs("uploads", exist_ok=True)
	user = app.config['USER_STORE'].get_user(user_id)
	user.reset('yaml')
	yaml_configuration = user.get_yaml_data()
	excel_data_filepath = user.get_excel_data().get_file_location()
	response = dict()
	if check_if_empty(yaml_data):
		response['error'] = "YAML file is either empty or not valid"
	else:
		sheet_name = user.get_excel_data().get_sheet_name()
		filename = str(Path(app.config['UPLOAD_FOLDER']) / user_id) + ".yaml"
		with open(filename, "w") as f:
			f.write(yaml_data)
			yaml_configuration.set_file_location(filename)
		region, template = load_yaml_data(filename)
		yaml_configuration.set_region(region)
		yaml_configuration.set_template(template)

		item_table = user.get_wikifier_output_data().get_item_table()
		template = yaml_configuration.get_template()
		response['region'] = highlight_region(item_table, excel_data_filepath, sheet_name, region, template)

	return json.dumps(response, indent=3)


@app.route('/resolve_cell', methods=['POST'])
def get_cell_statement():
	"""
	This function returns the statement of a particular cell
	:return:
	"""
	user_id = request.form["id"]
	column = get_excel_column_index(request.form["col"])
	row = get_excel_row_index(request.form["row"])
	user = app.config['USER_STORE'].get_user(user_id)
	if user.get_yaml_data().get_file_location():
		excel_data_filepath = user.get_excel_data().get_file_location()
		sheet_name = user.get_excel_data().get_sheet_name()
		template = user.get_yaml_data().get_template()
		region = user.get_yaml_data().get_region()
		item_table = user.get_wikifier_output_data().get_item_table()
		return resolve_cell(item_table, excel_data_filepath, sheet_name, region, template, column, row)
	else:
		data = {"error": "YAML file not found"}
		return json.dumps(data)


@app.route('/download', methods=['POST'])
def downloader():
	"""
	This functions initiates the download
	:return:
	"""
	user_id = request.form["id"]
	filetype = request.form["type"]
	user = app.config['USER_STORE'].get_user(user_id)
	excel_data_filepath = user.get_excel_data().get_file_location()
	sheet_name = user.get_excel_data().get_sheet_name()
	template = user.get_yaml_data().get_template()
	region = user.get_yaml_data().get_region()
	item_table = user.get_wikifier_output_data().get_item_table()
	sparql_endpoint = user.get_sparql_endpoint()
	return generate_download_file(user_id, item_table, excel_data_filepath, sheet_name, region, template, filetype, sparql_endpoint)


@app.route('/upload_wikifier_output', methods=['POST'])
def upload_wikified_output():
	"""
	This function uploads the wikifier output
	:return:
	"""
	user_id = request.form["id"]
	os.makedirs("uploads", exist_ok=True)
	user = app.config['USER_STORE'].get_user(user_id)
	user.reset('wikifier_output')
	response = wikified_output_uploader(user)
	excel_data_filepath = user.get_excel_data().get_file_location()
	sheet_name = user.get_excel_data().get_sheet_name()
	wikifier_output_filepath = user.get_wikifier_output_data().get_file_location()
	if excel_data_filepath and excel_data_filepath:
		item_table = user.get_wikifier_output_data().get_item_table()
		if not item_table:
			item_table = ItemTable()
			user.get_wikifier_output_data().set_item_table(item_table)
		build_item_table(item_table, wikifier_output_filepath, excel_data_filepath, sheet_name)
		response = item_table.get_region_qnodes()
	return json.dumps(response, indent=3)


@app.route('/update_setting', methods=['POST'])
def update_setting():
	"""
	This function updates the settings from GUI
	:return:
	"""
	user_id = request.form["id"]
	endpoint = request.form["endpoint"]
	user = app.config['USER_STORE'].get_user(user_id)
	user.set_sparql_endpoint(endpoint)


@app.route('/wikifier', methods=['POST'])
def wikify_region():
	"""
	This function perfomas three tasks; calls the wikifier service to wikifiy a region, delete a region's wikification result
	and update the wikification result.
	:return:
	"""
	user_id = request.form["id"]
	action = request.form["action"]
	region = request.form["region"]
	user = app.config['USER_STORE'].get_user(user_id)
	data = ""
	if action == "add_region":
		excel_filepath = user.get_excel_data().get_file_location()
		sheet_name = user.get_excel_data().get_sheet_name()
		item_table = user.get_wikifier_output_data().get_item_table()
		if not item_table:
			item_table = ItemTable()
			user.get_wikifier_output_data().set_item_table(item_table)
		if not excel_filepath:
			data = "No excel file to wikify"
		else:
			data = wikifier(item_table, region, excel_filepath, sheet_name)
	elif action == "delete_region":
		item_table = user.get_wikifier_output_data().get_item_table()
		item_table.delete_region(region)
		data = item_table.get_region_qnodes()
	elif action == "update_qnode":
		cell = request.form["cell"]
		qnode = request.form["qnode"]
		apply_to = int(request.form["apply_to"])
		item_table = user.get_wikifier_output_data().get_item_table()
		if apply_to == 0:
			item_table.update_cell(region, cell, qnode)
		elif apply_to == 1:
			excel_filepath = user.get_excel_data().get_file_location()
			sheet_name = user.get_excel_data().get_sheet_name()
			item_table.update_all_cells_within_region(region, cell, qnode, excel_filepath, sheet_name)
		elif apply_to == 2:
			excel_filepath = user.get_excel_data().get_file_location()
			sheet_name = user.get_excel_data().get_sheet_name()
			item_table.update_all_cells_in_all_region(cell, qnode, excel_filepath, sheet_name)
		data = item_table.get_region_qnodes()
	return json.dumps(data, indent=3)


@app.route('/delete_user', methods=['POST'])
def remove_user():
	"""
	This function deletes the user data
	:return:
	"""
	user_id = request.form["id"]
	users = app.config['USER_STORE']
	users.delete_user(user_id)
	data = "User deleted successfully"
	return json.dumps(data, indent=3)


@app.route('/login', methods=['POST'])
def login():
	response = {"vs": None}
	if 'token' in request.form and 'source' in request.form:
		token = request.form['token']
		source = request.form['source']
		user_info, error = verify_google_login(token)
		if user_info:
			if source == "Google":
				user_id = add_login_source_in_user_id(user_info["sub"], source)
				name = user_info["name"]
				email = user_info["email"]
				picture = user_info["picture"]
				given_name = user_info["given_name"]
				family_name = user_info["family_name"]
				locale = user_info["locale"]
				app.config['USER_STORE'].create_user(user_id, name, email, picture, given_name, family_name, locale)
				session['uid'] = user_id
			verification_status = True
		else:
			verification_status = False
	else:
		verification_status = False
		error = "Invalid Request"
	response["vs"] = verification_status
	response["error"] = error
	return json.dumps(response)


@app.route('/project/<string:pid>', methods=['POST'])
def open_project(pid):
	if 'uid' in session:
		return app.make_response(render_template('project.html', pid=pid))
	else:
		return redirect(url_for('index'))


@app.route('/project', methods=['POST'])
def project_home():
	if 'uid' in session:
		user = app.config['USER_STORE'].get_user(session['uid'])
		name, email, picture, given_name, family_name, locale = user.get_user_info()
		return make_response(render_template('home.html', uid=session['uid'], name=name, email=email, picture=picture, given_name=given_name, family_name=family_name, locale=locale))
	else:
		return redirect(url_for('index'))


@app.route('/project_meta', methods=['POST'])
def project_meta():
	if 'uid' in session:
		user = app.config['USER_STORE'].get_user(session['uid'])
		project_details = user.get_details_of_all_projects()
	else:
		project_details = None
	project_details_json = json.dumps(project_details)
	return project_details_json


@app.route('/new_project', methods=['POST'])
def new_project():
	response = None
	if 'uid' in session:
		user = app.config['USER_STORE'].get_user(session['uid'])
		if 'ptitle' in request.form:
			title = request.form['ptitle']
			project_id = user.create_project(title)
			response['pid'] = project_id
	response_json = json.dumps(response)
	return response_json


@app.route('/project_files', methods=['POST'])
def project_files():
	response = {
				"data_file": None,
				"yaml_file": None,
				"yaml_regions": None,
				"wikified_regions": None,
				"settings": {"endpoint": None}
			}
	if 'uid' in session:
		user = app.config['USER_STORE'].get_user(session['uid'])
		pid = request.form['pid']
		project = user.get_project(pid)
		response["data_file"] = project.get_current_data_file_contents()
		response["settings"]["endpoint"] = project.get_sparql_endpoint()
		response["wikified_regions"] = project.get_wikified_regions_of_current_data_file()
	response_json = json.dumps(response)
	return response_json


if __name__ == "__main__":
	app.run(threaded=True)
