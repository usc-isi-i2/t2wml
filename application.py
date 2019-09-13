from app_config import app
from flask import request, render_template, redirect, url_for, session, make_response
from werkzeug.utils import secure_filename
import json
from pathlib import Path
import os
from time import time
from Code.utility_functions import *
from Code.handler import highlight_region, resolve_cell, generate_download_file, load_yaml_data, build_item_table, wikifier
from Code.User import User
from Code.ItemTable import ItemTable
from Code.DataFile import DataFile
from Code.Project import Project
from Code.YAMLFile import YAMLFile
import shutil

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


def data_file_uploader(uid: str, pid: str, sheet_name: str=None):
	"""
	This function helps in processing the data file
	:param uid:
	:param pid:
	:param sheet_name:
	:return:
	"""
	response = {"error": ""}
	# if sheet_name and not check_if_empty(data_file.get_file_location()):
	# 	file_path = data_file.get_file_location()
	# 	data = excel_to_json(file_path, sheet_name)
	# 	data_file.set_sheet_name(sheet_name)
	# else:
	if 'file' not in request.files:
		response["error"] = 'No file part'
	else:
		file = request.files['file']
		if file.filename == '':
			response["error"] = 'No file selected for uploading'
		if file and allowed_file(file.filename):
			file_extension = get_file_extension(file.filename)
			file_id = generate_id()
			new_filename = file_id + "." + file_extension
			response["dataFileMapping"] = {new_filename: file.filename}
			response["isCSV"] = True if file_extension.lower() == "csv" else False
			response["currentDataFile"] = new_filename
			file_path = str(Path(app.config['UPLOAD_FOLDER']) / uid / pid / "df" / new_filename)
			file.save(file_path)
			data = excel_to_json(file_path, sheet_name)
			response.update(data)
		else:
			response["error"] = 'This file type is currently not supported'
	return response


def wikified_output_uploader(uid, pid):
	"""
	This function helps in processing the wikifier output file
	:param uid:
	:param pid:
	:return:
	"""
	error = None
	if 'wikifier_output' not in request.files:
		error = 'No file part'
	else:
		file = request.files['wikifier_output']
		if file.filename == '':
			error = 'No file selected for uploading'
		if file and allowed_file(file.filename, "csv"):
			file_path = str(Path(app.config['UPLOAD_FOLDER']) / uid / pid / "wf" / "other.csv")
			file.save(file_path)
		else:
			error = 'This file type is currently not supported'
	return error


@app.route('/', methods=['GET'])
def index():
	"""
	This functions renders the GUI
	:return:
	"""
	if 'uid' in session:
		return redirect(url_for('project_home'))
	else:
		return render_template('login.html')


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
				app.config['USER_STORE'].create_user(user_id, user_info)
				session['uid'] = user_id
				create_directory(app.config['UPLOAD_FOLDER'], session['uid'])
			verification_status = True
		else:
			verification_status = False
	else:
		verification_status = False
		error = "Invalid Request"
	response["vs"] = verification_status
	response["error"] = error
	return json.dumps(response)


@app.route('/project/<string:pid>', methods=['GET'])
def open_project(pid):
	if 'uid' in session:
		user_info = app.config['USER_STORE'].get_user_info(session['uid'])
		user_info_json = json.dumps(user_info)
		project_config_path = get_project_config_path(session['uid'], pid)
		project = Project(project_config_path)
		project.update_mdate()
		return app.make_response(render_template('project.html', pid=pid, userInfo=user_info_json))
	else:
		return redirect(url_for('index'))


@app.route('/project', methods=['GET'])
def project_home():
	if 'uid' in session:
		user_info = app.config['USER_STORE'].get_user_info(session['uid'])
		user_info_json = json.dumps(user_info)
		return make_response(render_template('home.html', userInfo=user_info_json))
	else:
		return redirect(url_for('index'))


@app.route('/get_project_meta', methods=['POST'])
def project_meta():
	if 'uid' in session:
		user_dir = Path(app.config['UPLOAD_FOLDER']) / session['uid']
		project_details = get_project_details(user_dir)
	else:
		project_details = None
	project_details_json = json.dumps(project_details)
	return project_details_json


@app.route('/create_project', methods=['POST'])
def create_project():
	if 'uid' in session:
		response = dict()
		if 'ptitle' in request.form:
			project_title = request.form['ptitle']
			project_id = generate_id()
			response['pid'] = project_id
			create_directory(app.config['UPLOAD_FOLDER'], session['uid'], project_id, project_title)
	else:
		response = None
	response_json = json.dumps(response)
	return response_json


@app.route('/upload_data_file', methods=['POST'])
def upload_data_file():
	"""
	This function uploads the data file
	:return:
	"""
	if 'uid' in session:
		response = {
					"tableData": dict(),
					"wikifierData": dict(),
					"yamlData": dict(),
					"error": None
				}
		project_meta = dict()
		user_id = session['uid']
		project_id = request.form['pid']
		data = data_file_uploader(user_id, project_id)
		if data["error"]:
			response["error"] = data["error"]
		else:
			table_data = response["tableData"]
			curr_data_file_id = data["currentDataFile"]
			project_meta["currentDataFile"] = curr_data_file_id
			curr_data_file_name = data["dataFileMapping"][curr_data_file_id]
			project_meta["dataFileMapping"] = data["dataFileMapping"]
			project_meta["mdate"] = int(time() * 1000)
			table_data["fileName"] = curr_data_file_name
			table_data["isCSV"] = data["isCSV"]
			if not table_data["isCSV"]:
				table_data["sheetNames"] = data["sheetNames"]
				table_data["currSheetName"] = data["currSheetName"]
				project_meta["currentSheetName"] = data["currSheetName"]
			else:
				table_data["sheetNames"] = None
				table_data["currSheetName"] = None
				project_meta["currentSheetName"] = None
			table_data["sheetData"] = data["sheetData"]

		project_config_path = get_project_config_path(user_id, project_id)
		project = Project(project_config_path)
		project.update_project_config(project_meta)

		data_file_name, sheet_name = project.get_current_file_and_sheet()
		region_map, region_file_name = get_region_mapping(user_id, project_id, project)
		item_table = ItemTable(region_map)
		wikifier_output_filepath = str(Path.cwd() / "config" / "uploads" / user_id / project_id / "wf" / "other.csv")
		data_file_path = str(Path.cwd() / "config" / "uploads" / user_id / project_id / "df" / data_file_name)

		if Path(wikifier_output_filepath).exists():
			build_item_table(item_table, wikifier_output_filepath, data_file_path, sheet_name)
		region_qnodes = item_table.get_region_qnodes()
		response["wikifierData"] = region_qnodes
		update_wikifier_region_file(user_id, project_id, region_file_name, region_qnodes)
		return json.dumps(response, indent=3)
	else:
		return redirect(url_for('index'))


@app.route('/change_sheet', methods=['POST'])
def change_sheet():
	if 'uid' in session:
		response = {
					"tableData": dict(),
					"wikifierData": dict(),
					"yamlData": dict(),
					"error": None
				}
		project_meta = dict()
		user_id = session['uid']
		new_sheet_name = request.form['sheet_name']
		project_id = request.form['pid']
		project_config_path = get_project_config_path(user_id, project_id)
		project = Project(project_config_path)
		data_file_id, current_sheet_name = project.get_current_file_and_sheet()
		data_file_path = str(Path.cwd() / "config" / "uploads" / user_id / project_id / "df" / data_file_id)
		data = excel_to_json(data_file_path, new_sheet_name)
		table_data = response["tableData"]
		table_data["fileName"] = project.get_file_name_by_id(data_file_id)
		table_data["isCSV"] = False # because CSVs don't have sheets
		table_data["sheetNames"] = data["sheetNames"]
		table_data["currSheetName"] = data["currSheetName"]
		table_data["sheetData"] = data["sheetData"]
		project_meta["currentSheetName"] = data["currSheetName"]
		project.update_project_config(project_meta)

		region_map, region_file_name = get_region_mapping(user_id, project_id, project)
		item_table = ItemTable(region_map)
		wikifier_output_filepath = str(Path.cwd() / "config" / "uploads" / user_id / project_id / "wf" / "other.csv")
		if Path(wikifier_output_filepath).exists():
			build_item_table(item_table, wikifier_output_filepath, data_file_path, new_sheet_name)
		region_qnodes = item_table.get_region_qnodes()
		response["wikifierData"] = region_qnodes
		update_wikifier_region_file(user_id, project_id, region_file_name, region_qnodes)
		return json.dumps(response, indent=3)


@app.route('/upload_wikifier_output', methods=['POST'])
def upload_wikifier_output():
	"""
	This function uploads the wikifier output
	:return:
	"""
	if 'uid' in session:
		response = dict()
		user_id = session['uid']
		project_id = request.form['pid']
		error = wikified_output_uploader(user_id, project_id)
		project_config_path = get_project_config_path(user_id, project_id)
		project = Project(project_config_path)
		file_name, sheet_name = project.get_current_file_and_sheet()
		if file_name:
			region_map, region_file_name = get_region_mapping(user_id, project_id, project)
			item_table = ItemTable(region_map)
			wikifier_output_filepath = str(Path.cwd() / "config" / "uploads" / user_id / project_id / "wf" / "other.csv")
			data_filepath = str(Path.cwd() / "config" / "uploads" / user_id / project_id / "df" / file_name)
			build_item_table(item_table, wikifier_output_filepath, data_filepath, sheet_name)
			response.update(item_table.get_region_qnodes())
			update_wikifier_region_file(user_id, project_id, region_file_name, response)
		response['error'] = error
		return json.dumps(response, indent=3)


@app.route('/upload_yaml', methods=['POST'])
def upload_yaml():
	"""
	This function process the yaml
	:return:
	"""
	user_id = session['uid']
	project_id = request.form['pid']
	yaml_data = request.form["yaml"]
	project_config_path = get_project_config_path(user_id, project_id)
	project = Project(project_config_path)
	data_file_name, sheet_name = project.get_current_file_and_sheet()
	yaml_configuration = YAMLFile()
	data_file_path = str(Path.cwd() / "config" / "uploads" / user_id / project_id / "df" / data_file_name)
	response = {'error': None}
	if check_if_empty(yaml_data):
		response['error'] = "YAML file is either empty or not valid"
	else:
		yaml_file_id = project.get_yaml_file_id(data_file_name, sheet_name)
		if not yaml_file_id:
			yaml_file_id = generate_id()
		yaml_file_name = yaml_file_id + ".yaml"
		yaml_config_file_name = yaml_file_id + ".pickle"
		yaml_config_file_path = str(Path.cwd() / "config" / "uploads" / user_id / project_id / "yf" / yaml_config_file_name)
		yaml_file_path = str(Path.cwd() / "config" / "uploads" / user_id / project_id / "yf" / yaml_file_name)
		with open(yaml_file_path, "w") as f:
			f.write(yaml_data)
			yaml_configuration.set_file_location(yaml_file_path)
		region, template = load_yaml_data(yaml_file_path)
		yaml_configuration.set_region(region)
		yaml_configuration.set_template(template)
		project.add_yaml_file(data_file_name, sheet_name, yaml_file_id)
		save_yaml_config(yaml_config_file_path, yaml_configuration)

		if data_file_name:
			wikifier_config_file_name = project.get_or_create_wikifier_region_filename()
			wikifier_config = deserialize_wikifier_config(user_id, project_id, wikifier_config_file_name)
			item_table = ItemTable(wikifier_config)
			template = yaml_configuration.get_template()
			response['yamlRegions'] = highlight_region(item_table, data_file_path, sheet_name, region, template)
		else:
			response['yamlRegions'] = None
			response['error'] = "Upload data file before applying YAML."
	return json.dumps(response, indent=3)


@app.route('/resolve_cell', methods=['POST'])
def get_cell_statement():
	"""
	This function returns the statement of a particular cell
	:return:
	"""
	user_id = session["uid"]
	project_id = request.form["pid"]
	column = get_excel_column_index(request.form["col"])
	row = get_excel_row_index(request.form["row"])
	project_config_path = get_project_config_path(user_id, project_id)
	project = Project(project_config_path)
	data_file_name, sheet_name = project.get_current_file_and_sheet()
	yaml_file_id = project.get_yaml_file_id(data_file_name, sheet_name)
	if yaml_file_id:
		yaml_config_file_name = yaml_file_id + ".pickle"
		yaml_config_file_path = str(Path.cwd() / "config" / "uploads" / user_id / project_id / "yf" / yaml_config_file_name)
		yaml_config = load_yaml_config(yaml_config_file_path)
		data_file_path = str(Path.cwd() / "config" / "uploads" / user_id / project_id / "df" / data_file_name)
		template = yaml_config.get_template()
		region = yaml_config.get_region()
		region_map, region_file_name = get_region_mapping(user_id, project_id, project)
		item_table = ItemTable(region_map)
		data = resolve_cell(item_table, data_file_path, sheet_name, region, template, column, row)
	else:
		data = {"error": "YAML file not found"}
	return json.dumps(data)


@app.route('/download', methods=['POST'])
def downloader():
	"""
	This functions initiates the download
	:return:
	"""
	user_id = session["uid"]
	filetype = request.form["type"]
	project_id = request.form["pid"]
	project_config_path = get_project_config_path(user_id, project_id)
	project = Project(project_config_path)
	data_file_name, sheet_name = project.get_current_file_and_sheet()
	data_file_path = str(Path.cwd() / "config" / "uploads" / user_id / project_id / "df" / data_file_name)

	yaml_file_id = project.get_yaml_file_id(data_file_name, sheet_name)
	yaml_config_file_name = yaml_file_id + ".pickle"
	yaml_config_file_path = str(Path.cwd() / "config" / "uploads" / user_id / project_id / "yf" / yaml_config_file_name)
	yaml_config = load_yaml_config(yaml_config_file_path)
	template = yaml_config.get_template()
	region = yaml_config.get_region()

	region_map, region_file_name = get_region_mapping(user_id, project_id, project)
	item_table = ItemTable(region_map)
	sparql_endpoint = project.get_sparql_endpoint()
	response = generate_download_file(user_id, item_table, data_file_path, sheet_name, region, template, filetype, sparql_endpoint)
	return json.dumps(response, indent=3)


@app.route('/update_setting', methods=['POST'])
def update_setting():
	"""
	This function updates the settings from GUI
	:return:
	"""
	user_id = session["uid"]
	project_id = request.form["pid"]
	endpoint = request.form["endpoint"]
	project_config_path = get_project_config_path(user_id, project_id)
	project = Project(project_config_path)
	project.update_sparql_endpoint(endpoint)
	return json.dumps(None)


@app.route('/call_wikifier_service', methods=['POST'])
def wikify_region():
	"""
	This function perfoms three tasks; calls the wikifier service to wikifiy a region, delete a region's wikification result
	and update the wikification result.
	:return:
	"""
	user_id = session["uid"]
	project_id = request.form["pid"]
	action = request.form["action"]
	region = request.form["region"]
	project_config_path = get_project_config_path(user_id, project_id)
	project = Project(project_config_path)
	data_file_name, sheet_name = project.get_current_file_and_sheet()
	data_file_path = str(Path.cwd() / "config" / "uploads" / user_id / project_id / "df" / data_file_name)
	region_map, region_file_name = get_region_mapping(user_id, project_id, project)
	item_table = ItemTable(region_map)
	data = dict()
	if action == "add_region":
		if not data_file_path:
			data['error'] = "No excel file to wikify"
		else:
			data = wikifier(item_table, region, data_file_path, sheet_name)
			wikifier_region_file_name = project.get_or_create_wikifier_region_filename()
			update_wikifier_region_file(user_id, project_id, wikifier_region_file_name, data)
	elif action == "delete_region":
		item_table.delete_region(region)
		data = item_table.get_region_qnodes()
		wikifier_region_file_name = project.get_or_create_wikifier_region_filename()
		update_wikifier_region_file(user_id, project_id, wikifier_region_file_name, data)
	elif action == "update_qnode":
		cell = request.form["cell"]
		qnode = request.form["qnode"]
		apply_to = int(request.form["apply_to"])
		if apply_to == 0:
			item_table.update_cell(region, cell, qnode)
		elif apply_to == 1:
			item_table.update_all_cells_within_region(region, cell, qnode, data_file_path, sheet_name)
		elif apply_to == 2:
			item_table.update_all_cells_in_all_region(cell, qnode, data_file_path, sheet_name)
		data = item_table.get_region_qnodes()
		wikifier_region_file_name = project.get_or_create_wikifier_region_filename()
		update_wikifier_region_file(user_id, project_id, wikifier_region_file_name, data)
	if 'error' not in data:
		data['error'] = None
	return json.dumps(data, indent=3)


@app.route('/get_project_files', methods=['POST'])
def get_project_files():
	response = {
				"tableData": None,
				"yamlData": None,
				"wikifierData": None,
				"settings": {"endpoint": None}
			}
	if 'uid' in session:
		user_id = session["uid"]
		project_id = request.form['pid']
		project_config_path = get_project_config_path(user_id, project_id)
		project = Project(project_config_path)
		data_file_id, sheet_name = project.get_current_file_and_sheet()
		if data_file_id:
			file_extension = get_file_extension(data_file_id)
			response["tableData"] = dict()
			response["tableData"]["isCSV"] = True if file_extension.lower() == "csv" else False
			response["tableData"]["filename"] = project.get_file_name_by_id(data_file_id)
			data_file_path = str(Path(app.config['UPLOAD_FOLDER']) / user_id / project_id / "df" / data_file_id)
			response["tableData"].update(excel_to_json(data_file_path, sheet_name))
			if response["tableData"]["isCSV"]:
				response["tableData"]["currSheetName"] = None
				response["tableData"]["sheetNames"] = None
		else:
			response["tableData"] = None

		wikifier_config_file_name = project.get_wikifier_region_filename()
		if wikifier_config_file_name:
			wikifier_config = deserialize_wikifier_config(user_id, project_id, wikifier_config_file_name)
			item_table = ItemTable(wikifier_config)
			region_qnodes = item_table.get_region_qnodes()
			response["wikifierData"] = region_qnodes
		else:
			response["wikifierData"] = None
			item_table = ItemTable()

		yaml_file_id = project.get_yaml_file_id(data_file_id, sheet_name)
		if yaml_file_id:
			response["yamlData"] = dict()
			yaml_file_name = yaml_file_id + ".yaml"
			yaml_file_path = str(Path.cwd() / "config" / "uploads" / user_id / project_id / "yf" / yaml_file_name)
			response["yamlData"]["yamlFileContent"] = read_file(yaml_file_path)
			if data_file_id:
				yaml_config_file_name = yaml_file_id + ".pickle"
				yaml_config_file_path = str(Path.cwd() / "config" / "uploads" / user_id / project_id / "yf" / yaml_config_file_name)
				data_file_path = str(Path(app.config['UPLOAD_FOLDER']) / user_id / project_id / "df" / data_file_id)

				yaml_config = load_yaml_config(yaml_config_file_path)
				template = yaml_config.get_template()
				region = yaml_config.get_region()
				response["yamlData"]['yamlRegions'] = highlight_region(item_table, data_file_path, sheet_name, region, template)
		else:
			response["yamlData"] = None
		response["settings"]["endpoint"] = project.get_sparql_endpoint()
	response_json = json.dumps(response)
	return response_json


@app.route('/logout', methods=['GET'])
def logout():
	if 'uid' in session:
		del session['uid']
	return redirect(url_for('index'))


@app.route('/rename_project', methods=['POST'])
def rename_project():
	if 'uid' in session:
		user_id = session['uid']
		project_id = request.form["pid"]
		ptitle = request.form["ptitle"]
		project_config_path = get_project_config_path(user_id, project_id)
		project = Project(project_config_path)
		project.update_project_title(ptitle)
		user_dir = Path(app.config['UPLOAD_FOLDER']) / user_id
		project_details = get_project_details(user_dir)
	else:
		project_details = None
	project_details_json = json.dumps(project_details)
	return project_details_json


@app.route('/delete_project', methods=['POST'])
def delete_project():
	if 'uid' in session:
		user_id = session['uid']
		project_id = request.form["pid"]
		project_directory = Path(app.config['UPLOAD_FOLDER']) / session['uid'] / project_id
		# project_directory.unlink()
		shutil.rmtree(project_directory)

		# project_config_path = get_project_config_path(user_id, project_id)
		# project = Project(project_config_path)
		# project.update_project_title(ptitle)
		user_dir = Path(app.config['UPLOAD_FOLDER']) / user_id
		project_details = get_project_details(user_dir)
	else:
		project_details = None
	project_details_json = json.dumps(project_details)
	return project_details_json


if __name__ == "__main__":
	app.run(threaded=True)
