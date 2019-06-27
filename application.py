from app_config import app
from flask import request, Response
from werkzeug.utils import secure_filename
import json
import sys
from pathlib import Path
sys.path.insert(0, app.config['CODE_FOLDER'])
from utility_functions import excel_to_json, read_file
from handler import highlight_region, resolve_cell

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
            file_path = app.config['UPLOAD_FOLDER'] / filename
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
    create_user(user_id)
    return upload_file(user_id)


@app.route('/upload_yaml', methods=['POST'])
def upload_yaml():
    user_id = request.args.get("id")
    create_user(user_id)
    yaml_data = request.values("yaml")
    # yaml.dump(yaml_data, os.path.join(app.config['UPLOAD_FOLDER'], user_id + ".yaml"), allow_unicode=True)
    filename = Path(app.config['UPLOAD_FOLDER']) / user_id + ".yaml"
    with open(filename, "w") as f:
        f.write(yaml_data)
        app.config["__user_files__"][user_id]['yaml'] = str(Path(app.config["UPLOAD_FOLDER"]) / filename)
    return highlight_region(user_id)


@app.route('/resolve_cell', methods=['POST'])
def get_cell_statement():
    user_id = request.args.get("id")
    create_user(user_id)
    col = int(request.args.get("col"))
    row = int(request.args.get("row"))
    return resolve_cell(user_id, col, row)


if __name__ == "__main__":
    app.run()
