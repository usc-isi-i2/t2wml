import os
import uuid
import urllib.request
from app_config import app
from flask import Flask, flash, request, redirect, render_template, url_for, session, Response
from werkzeug.utils import secure_filename
from Code.utility_functions import excel_to_json, read_file
import json


ALLOWED_EXCEL_FILE_EXTENSIONS = {'xlsx', 'xls', 'csv'}
ALLOWED_YAML_FILE_EXTENSIONS = {'yaml', 'txt'}


def allowed_file(filename: str, file_type: str):
    if file_type == "excel":
        return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXCEL_FILE_EXTENSIONS
    else:
        return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_YAML_FILE_EXTENSIONS


def upload_file(file_type: str):
    user_id = request.cookies.get('userID')
    message = ""
    if request.method == 'POST':
        if 'file' not in request.files:
            message = 'No file part'
        file = request.files['file']
        if file.filename == '':
            message = 'No file selected for uploading'
        if file and allowed_file(file.filename, file_type):
            filename = secure_filename(file.filename)
            file_path = os.path.join(app.config['UPLOAD_FOLDER'], user_id + "_" + filename)
            file.save(file_path)
            if file_type == "excel":
                message = excel_to_json(file_path)
            else:
                message = read_file(file_path)
        else:
            message = 'This file type is currently not supported'

        js = json.dumps(message)
        resp = Response(js, status=200, mimetype='application/json')
        resp.headers['Access-Control-Allow-Origin'] = '*'

        return resp


@app.route('/')
def upload_form():
    resp = app.make_response(render_template('upload.html'))
    if not request.cookies.get('userID'):
        user_id = uuid.uuid4().hex
        resp.set_cookie('userID', user_id)
    try:
        print(session["file_content"])
    except KeyError:
        pass
    return resp


@app.route('/upload_excel', methods=['POST'])
def upload_excel():
    return upload_file("excel")


@app.route('/upload_yaml', methods=['POST'])
def upload_yaml():
    return upload_file("yaml")


if __name__ == "__main__":
    app.run()
