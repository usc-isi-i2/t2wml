from app_config import app
from flask import request, Response, render_template
from werkzeug.utils import secure_filename
import json
import time
from pathlib import Path
from Code.utility_functions import check_if_empty
from Code.utility_functions import excel_to_json, read_file, get_excel_row_index, get_excel_column_index
from Code.handler import highlight_region, resolve_cell, generate_download_file

ALLOWED_EXCEL_FILE_EXTENSIONS = {'xlsx', 'xls', 'csv'}


def allowed_file(filename: str):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXCEL_FILE_EXTENSIONS


def get_file_extension(filename: str):
    return filename.split(".")[-1]


def upload_file(user_id: str, sheet_name: str):
    data = ""
    if sheet_name:
        try:
            file_path = app.config["__user_files__"][user_id]['excel']
            data = excel_to_json(file_path, sheet_name)
        except KeyError:
            data = "Excel file not found"
    else:
        if 'file' not in request.files:
            data = 'No file part'
        else:
            file = request.files['file']
            if file.filename == '':
                data = 'No file selected for uploading'
            if file and allowed_file(file.filename):
                filename = secure_filename(file.filename)
                filename = user_id + "." + get_file_extension(filename)
                file_path = str(Path(app.config['UPLOAD_FOLDER']) / filename)
                file.save(file_path)
                data = excel_to_json(file_path, sheet_name)
                app.config["__user_files__"][user_id]['excel'] = str(Path(app.config["UPLOAD_FOLDER"]) / filename)
            else:
                data = 'This file type is currently not supported'

    js = json.dumps(data)
    resp = Response(js, status=200, mimetype='application/json')
    resp.headers['Access-Control-Allow-Origin'] = '*'
    resp.headers['Access-Control-Allow-Methods'] = 'POST'
    resp.headers['Access-Control-Allow-Headers'] = "Origin, X-Requested-With, Content-Type, Accept"
    return resp


def create_user(user_id: str):
    if user_id not in app.config["__user_files__"]:
        app.config["__user_files__"][user_id] = {}


@app.route('/')
def upload_form():
    resp = app.make_response(render_template('index.html'))
    return resp


@app.route('/upload_excel', methods=['POST'])
def upload_excel():
    t = time.time()
    user_id = request.args.get("id")
    create_user(user_id)
    try:
        sheet_name = request.args.get("sheet_name")
    except:
        sheet_name = None
    return upload_file(user_id, sheet_name)


@app.route('/upload_yaml', methods=['POST'])
def upload_yaml():
    user_id = request.args.get("id")
    create_user(user_id)
    yaml_data = request.values["yaml"]
    if check_if_empty(yaml_data):
        return json.dumps("Yaml")
    try:
        sheet_name = request.args.get("sheet_name")
    except:
        sheet_name = None
    filename = str(Path(app.config['UPLOAD_FOLDER']) / user_id) + ".yaml"
    with open(filename, "w") as f:
        f.write(yaml_data)
        app.config["__user_files__"][user_id]['yaml'] = filename
        app.config["__user_files__"][user_id]['sheet_name'] = sheet_name
    return highlight_region(user_id, sheet_name)


@app.route('/resolve_cell', methods=['POST'])
def get_cell_statement():
    user_id = request.args.get("id")
    col = get_excel_column_index(request.args.get("col"))
    row = get_excel_row_index(request.args.get("row"))
    try:
        sheet_name = app.config["__user_files__"][user_id]['sheet_name']
    except KeyError:
        sheet_name = None
    return resolve_cell(user_id, col, row, sheet_name)


@app.route('/download', methods=['POST'])
def downloader():
    user_id = request.args.get("id")
    filetype = request.args.get("type")
    try:
        sheet_name = app.config["__user_files__"][user_id]['sheet_name']
    except KeyError:
        sheet_name = None
    return generate_download_file(user_id, filetype, sheet_name)


@app.route('/upload_wikifier_output', methods=['POST'])
def upload_wikified_output():
    user_id = request.args.get("id")
    wikified_output = request.args.get("wikified_output")

    filename = str(Path(app.config['UPLOAD_FOLDER']) / user_id) + "_wikified_output.csv"
    with open(filename, "w") as f:
        f.write(wikified_output)
        app.config["__user_files__"][user_id]['wikified_output'] = filename
    return json.dumps("True")


if __name__ == "__main__":
    app.run()
