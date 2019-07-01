from app_config import app
from flask import request, Response, render_template
from werkzeug.utils import secure_filename
import json
from pathlib import Path
from Code.utility_functions import excel_to_json, read_file, get_excel_row_index, get_excel_column_index
from Code.handler import highlight_region, resolve_cell, generate_download_file

ALLOWED_EXCEL_FILE_EXTENSIONS = {'xlsx', 'xls', 'csv'}


def allowed_file(filename: str):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXCEL_FILE_EXTENSIONS


def get_file_extension(filename: str):
    return filename.split(".")[-1]


def upload_file(user_id: str):
    data = ""
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
            data = excel_to_json(file_path)
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
    user_id = request.args.get("id")
    create_user(user_id)
    print(app.config["__user_files__"][user_id])
    return upload_file(user_id)


@app.route('/upload_yaml', methods=['POST'])
def upload_yaml():
    user_id = request.args.get("id")
    create_user(user_id)
    yaml_data = request.values["yaml"]
    filename = str(Path(app.config['UPLOAD_FOLDER']) / user_id) + ".yaml"
    with open(filename, "w") as f:
        f.write(yaml_data)
        app.config["__user_files__"][user_id]['yaml'] = filename
    return highlight_region(user_id)


@app.route('/resolve_cell', methods=['POST'])
def get_cell_statement():
    user_id = request.args.get("id")
    col = get_excel_column_index(request.args.get("col"))
    row = get_excel_row_index(request.args.get("row"))
    return resolve_cell(user_id, col, row)


@app.route('/download', methods=['POST'])
def downloader():
    user_id = request.args.get("id")
    filetype = request.args.get("type")
    return generate_download_file(user_id, filetype)


if __name__ == "__main__":
    app.run()
