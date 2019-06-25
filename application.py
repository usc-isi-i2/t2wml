import os
import uuid
import urllib.request
from app_config import app
from flask import Flask, flash, request, redirect, render_template, url_for, session, Response
from werkzeug.utils import secure_filename
import json
import yaml
import sys
sys.path.insert(0, app.config['UPLOAD_FOLDER'])
from utility_functions import excel_to_json, read_file
from handler import highlight_region

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
            file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            file.save(file_path)
            data = excel_to_json(file_path)
        else:
            data = 'This file type is currently not supported'

    js = json.dumps(data)
    resp = Response(js, status=200, mimetype='application/json')
    resp.headers['Access-Control-Allow-Origin'] = '*'
    resp.headers['Access-Control-Allow-Methods'] = 'POST'
    resp.headers['Access-Control-Allow-Headers'] = "Origin, X-Requested-With, Content-Type, Accept"
    return resp


# @app.route('/')
# def upload_form():
#     resp = app.make_response(render_template('index.html'))
#     if not request.cookies.get('userID'):
#         user_id = uuid.uuid4().hex
#         resp.set_cookie('userID', user_id)
#     try:
#         print(session["file_content"])
#     except KeyError:
#         pass
#     return resp


@app.route('/upload_excel', methods=['POST'])
def upload_excel():
    user_id = request.args.get("id")
    return upload_file(user_id)


@app.route('/upload_yaml', methods=['POST'])
def upload_yaml():
    user_id = request.args.get("id")
    yaml_data = request.args.get("yaml")
    # yaml.dump(yaml_data, os.path.join(app.config['UPLOAD_FOLDER'], user_id + ".yaml"), allow_unicode=True)
    with open(os.path.join(app.config['UPLOAD_FOLDER'], user_id + ".yaml"), "w") as f:
        f.write(yaml_data)
    # print(highlight_region(user_id))
    return highlight_region(user_id)


@app.route('/upload_yaml', methods=['POST'])
def resolve_cell():
    user_id = request.args.get("id")
    return highlight_region(user_id)


if __name__ == "__main__":
    app.run()
