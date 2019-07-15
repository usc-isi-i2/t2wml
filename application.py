from app_config import app
from flask import request, render_template
from werkzeug.utils import secure_filename
import json
from pathlib import Path
import os
from Code.utility_functions import check_if_empty
from Code.utility_functions import excel_to_json, read_file, get_excel_row_index, get_excel_column_index, delete_file
from Code.handler import highlight_region, resolve_cell, generate_download_file, load_yaml_data, build_item_table
from Code.UserData import UserData


ALLOWED_EXCEL_FILE_EXTENSIONS = {'xlsx', 'xls', 'csv'}


def allowed_file(filename: str, file_extensions=ALLOWED_EXCEL_FILE_EXTENSIONS):
	return '.' in filename and filename.rsplit('.', 1)[1].lower() in file_extensions


def get_file_extension(filename: str):
	return filename.split(".")[-1]


def excel_uploader(user: UserData, sheet_name: str):
	user_data = user.get_excel_data()
	data = {"error":""}
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
	# resp = Response(data, status=200, mimetype='application/json')
	# resp.headers['Access-Control-Allow-Origin'] = '*'
	# resp.headers['Access-Control-Allow-Methods'] = 'POST'
	# resp.headers['Access-Control-Allow-Headers'] = "Origin, X-Requested-With, Content-Type, Accept"
	return data


def wikified_output_uploader(user: UserData):
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
def upload_form():
	resp = app.make_response(render_template('index.html'))
	return resp


@app.route('/upload_excel', methods=['POST'])
def upload_excel():
	user_id = request.form["id"]
	is_new_upload = True if request.form["is_new_upload"] == "True" else False
	user = app.config['users'].get_user(user_id)
	sheet_name = request.form.get("sheetName")

	if is_new_upload:
		user.reset('excel')

	os.makedirs("uploads", exist_ok=True)
	response = excel_uploader(user, sheet_name)
	excel_data_filepath = user.get_excel_data().get_file_location()
	wikifier_output_filepath = user.get_wikifier_output_data().get_file_location()
	if excel_data_filepath and excel_data_filepath and wikifier_output_filepath:
		item_table = build_item_table(wikifier_output_filepath, excel_data_filepath, sheet_name)
		user.get_wikifier_output_data().set_item_table(item_table)
		response['qnodes'] = item_table.serialize_cell_to_qnode()

	return json.dumps(response)


@app.route('/upload_yaml', methods=['POST'])
def upload_yaml():
	user_id = request.form["id"]
	yaml_data = request.values["yaml"]

	os.makedirs("uploads", exist_ok=True)
	user = app.config['users'].get_user(user_id)
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

	return json.dumps(response)


@app.route('/resolve_cell', methods=['POST'])
def get_cell_statement():
	user_id = request.form["id"]
	column = get_excel_column_index(request.form["col"])
	row = get_excel_row_index(request.form["row"])
	user = app.config['users'].get_user(user_id)
	excel_data_filepath = user.get_excel_data().get_file_location()
	sheet_name = user.get_excel_data().get_sheet_name()
	template = user.get_yaml_data().get_template()
	region = user.get_yaml_data().get_region()
	item_table = user.get_wikifier_output_data().get_item_table()
	return resolve_cell(item_table, excel_data_filepath, sheet_name, region, template, column, row)


@app.route('/download', methods=['POST'])
def downloader():
	user_id = request.form["id"]
	filetype = request.form["type"]
	user = app.config['users'].get_user(user_id)
	excel_data_filepath = user.get_excel_data().get_file_location()
	sheet_name = user.get_excel_data().get_sheet_name()
	template = user.get_yaml_data().get_template()
	region = user.get_yaml_data().get_region()
	item_table = user.get_wikifier_output_data().get_item_table()
	return generate_download_file(user_id, item_table, excel_data_filepath, sheet_name, region, template, filetype)


@app.route('/upload_wikifier_output', methods=['POST'])
def upload_wikified_output():
	user_id = request.form["id"]
	os.makedirs("uploads", exist_ok=True)
	user = app.config['users'].get_user(user_id)
	user.reset('wikifier_output')
	response = wikified_output_uploader(user)
	excel_data_filepath = user.get_excel_data().get_file_location()
	sheet_name = user.get_excel_data().get_sheet_name()
	wikifier_output_filepath = user.get_wikifier_output_data().get_file_location()
	if excel_data_filepath and excel_data_filepath:
		item_table = build_item_table(wikifier_output_filepath, excel_data_filepath, sheet_name)
		user.get_wikifier_output_data().set_item_table(item_table)
		response['qnodes'] = item_table.serialize_cell_to_qnode()

	return json.dumps(response)


if __name__ == "__main__":
	app.run()
