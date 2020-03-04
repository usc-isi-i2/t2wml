from app_config import app
from flask import request, render_template, redirect, url_for, session, make_response
from Code.utility_functions import *
from Code.handler import highlight_region, resolve_cell, generate_download_file, load_yaml_data, \
    wikifier, add_excel_file_to_bindings, process_wikified_output_file
from Code.ItemTable import ItemTable
from Code.Project import Project
from Code.YAMLFile import YAMLFile
import shutil
import sys
ALLOWED_EXCEL_FILE_EXTENSIONS = {'xlsx', 'xls', 'csv'}
debug_mode = False


def get_template_path(filename: str):
    return (filename if not debug_mode else '{}_dev'.format(filename)) + '.html'


def is_file_allowed(filename: str, file_extensions=ALLOWED_EXCEL_FILE_EXTENSIONS) -> bool:
    """
    This function checks if the file extension is present in the list of allowed file extensions
    :param filename:
    :param file_extensions:
    :return:
    """
    return '.' in filename and get_file_extension(filename) in file_extensions


def get_file_extension(filename: str) -> str:
    """
    This function returns the file extension of a file
    :param filename:
    :return:
    """
    return filename.split(".")[-1].lower()


def data_file_uploader(uid: str, pid: str, sheet_name: str = None) -> dict:
    """
    This function helps in processing the data file upload request
    :param uid:
    :param pid:
    :param sheet_name:
    :return:
    """
    response = {"error": None}
    error = dict()
    if 'file' not in request.files:
        error["errorCode"] = "T2WMLException.NoFilePart"
        error["errorTitle"] = T2WMLException.NoFilePart.value
        error["errorDescription"] = "Missing 'file' parameter in the data file upload request"
    else:
        file = request.files['file']
        if file.filename == '':
            error["errorCode"] = "T2WMLException.BlankFileName"
            error["errorTitle"] = T2WMLException.BlankFileName.value
            error["errorDescription"] = "No data file selected for uploading"
        else:
            if file and is_file_allowed(file.filename):
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
                error["errorCode"] = "T2WMLException.FileTypeNotSupported"
                error["errorTitle"] = T2WMLException.FileTypeNotSupported.value
                error["errorDescription"] = "File with extension '" + get_file_extension(file.filename) + "' is not a valid data file"
    if error:
        response['error'] = error
    return response


def wikified_output_uploader(uid: str, pid: str) -> dict:
    """
    This function helps in processing the wikifier output file upload request
    :param uid:
    :param pid:
    :return:
    """
    error = dict()

    if 'wikifier_output' not in request.files:
        error["errorCode"] = "T2WMLException.NoFilePart"
        error["errorTitle"] = T2WMLException.NoFilePart.value
        error["errorDescription"] = "Missing 'file' parameter in the wikified output file upload request"
    else:
        file = request.files['wikifier_output']
        if file.filename == '':
            error["errorCode"] = "T2WMLException.BlankFileName"
            error["errorTitle"] = T2WMLException.BlankFileName.value
            error["errorDescription"] = "No wikified output file selected for uploading"
        else:
            if file and is_file_allowed(file.filename, "csv"):
                file_path = str(Path(app.config['UPLOAD_FOLDER']) / uid / pid / "wf" / "other.csv")
                file.save(file_path)
            else:
                error["errorCode"] = "T2WMLException.FileTypeNotSupported"
                error["errorTitle"] = T2WMLException.FileTypeNotSupported.value
                error["errorDescription"] = "File with extension '" + get_file_extension(file.filename) + "' is not a valid wikified output file"
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
        return render_template(get_template_path('login'))


@app.route('/login', methods=['POST'])
def login():
    """
    This function verifies the oath token and returns the authorization response
    :return:
    """
    response = {"vs": None, 'error': None}
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
        error = dict()
        error["errorCode"] = "T2WMLException.InvalidRequest"
        error["errorTitle"] = T2WMLException.InvalidRequest.value
        if 'token' in request.form and 'source' not in request.form:
            error["errorDescription"] = "Missing 'source' parameter in the login request"
        elif 'token' not in request.form and 'source' in request.form:
            error["errorDescription"] = "Missing 'token' parameter in the login request"
        elif 'token' not in request.form and 'source' not in request.form:
            error["errorDescription"] = "Missing 'token' and 'source' parameters in the login request"
    response["vs"] = verification_status
    response["error"] = error
    return json.dumps(response)


@app.route('/project/<string:pid>', methods=['GET'])
def open_project(pid: str):
    """
    This route opens the project and displays data file viewer, YAML viewer and Wikified output file viewer cards.
    :param pid:
    :return:
    """
    if 'uid' in session:
        user_info = app.config['USER_STORE'].get_user_info(session['uid'])
        user_info_json = json.dumps(user_info)
        project_config_path = get_project_config_path(session['uid'], pid)
        project = Project(project_config_path)
        return app.make_response(render_template(get_template_path('project'), pid=pid, userInfo=user_info_json))
    else:
        return redirect(url_for('index'))


@app.route('/project', methods=['GET'])
def project_home():
    """
    This route displays the list of projects with their details and gives user the option to rename, delete and download the project.
    :return:
    """
    if 'uid' in session:
        user_info = app.config['USER_STORE'].get_user_info(session['uid'])
        user_info_json = json.dumps(user_info)
        return make_response(render_template(get_template_path('home'), userInfo=user_info_json))
    else:
        return redirect(url_for('index'))


@app.route('/get_project_meta', methods=['POST'])
def get_project_meta():
    """
    This route is used to fetch details of all the projects viz. project title, project id, modified date etc.
    :return:
    """
    if 'uid' in session:
        user_dir = Path(app.config['UPLOAD_FOLDER']) / session['uid']
        project_details = get_project_details(user_dir)
    else:
        project_details = None
    project_details_json = json.dumps(project_details)
    return project_details_json


@app.route('/create_project', methods=['POST'])
def create_project():
    """
    This route creates a project by generating a unique id and creating a upload directory for that project
    :return:
    """
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
            table_data["filename"] = curr_data_file_name
            table_data["isCSV"] = data["isCSV"]
            if not table_data["isCSV"]:
                table_data["sheetNames"] = data["sheetNames"]
                table_data["currSheetName"] = data["currSheetName"]
                project_meta["currentSheetName"] = data["currSheetName"]
            else:
                table_data["sheetNames"] = None
                table_data["currSheetName"] = None
                project_meta["currentSheetName"] = curr_data_file_id
            table_data["sheetData"] = data["sheetData"]

            project_config_path = get_project_config_path(user_id, project_id)
            project = Project(project_config_path)

            data_file_name = curr_data_file_id
            sheet_name = project_meta["currentSheetName"]
            region_map, region_file_name = get_region_mapping(user_id, project_id, project, data_file_name, sheet_name)
            item_table = ItemTable(region_map)
            wikifier_output_filepath = str(Path.cwd() / "config" / "uploads" / user_id / project_id / "wf" / "other.csv")
            data_file_path = str(Path.cwd() / "config" / "uploads" / user_id / project_id / "df" / data_file_name)
            serialized_wikifier_output_filepath = str(Path.cwd() / "config" / "uploads" / user_id / project_id / "wf" / "result.csv")
            add_excel_file_to_bindings(data_file_path, sheet_name)

            if Path(wikifier_output_filepath).exists():
                process_wikified_output_file(wikifier_output_filepath, item_table, data_file_path, sheet_name)
            sparql_endpoint = project.get_sparql_endpoint()
            serialized_table = item_table.serialize_table(sparql_endpoint)
            save_wikified_result(serialized_table['rowData'], serialized_wikifier_output_filepath)
            response["wikifierData"] = serialized_table
            response['wikifiedOutputFilepath'] = serialized_wikifier_output_filepath
            project_meta["wikifierRegionMapping"] = dict()
            project_meta["wikifierRegionMapping"][data_file_name] = dict()
            project_meta["wikifierRegionMapping"][data_file_name][sheet_name] = region_file_name
            item_table_as_json = item_table.to_json()
            update_wikifier_region_file(user_id, project_id, region_file_name, item_table_as_json)

            yaml_file_id = project.get_yaml_file_id(data_file_name, sheet_name)
            if yaml_file_id:
                response["yamlData"] = dict()
                yaml_file_name = yaml_file_id + ".yaml"
                yaml_file_path = str(Path.cwd() / "config" / "uploads" / user_id / project_id / "yf" / yaml_file_name)
                response["yamlData"]["yamlFileContent"] = read_file(yaml_file_path)
                if data_file_name:
                    yaml_config_file_name = yaml_file_id + ".pickle"
                    yaml_config_file_path = str(
                        Path.cwd() / "config" / "uploads" / user_id / project_id / "yf" / yaml_config_file_name)
                    data_file_path = str(Path(app.config['UPLOAD_FOLDER']) / user_id / project_id / "df" / data_file_name)

                    yaml_config = load_yaml_config(yaml_config_file_path)
                    template = yaml_config.get_template()
                    region = yaml_config.get_region()
                    response["yamlData"]['yamlRegions'] = highlight_region(item_table, data_file_path, sheet_name, region, template)
                    project_meta["yamlMapping"] = dict()
                    project_meta["yamlMapping"][data_file_name] = dict()
                    project_meta["yamlMapping"][data_file_name][data["currSheetName"]] = yaml_file_id
            else:
                response["yamlData"] = None

            project.update_project_config(project_meta)
        return json.dumps(response, indent=3)
    else:
        return redirect(url_for('index'))


@app.route('/change_sheet', methods=['POST'])
def change_sheet():
    """
    This route is used when a user switches a sheet in an excel data file.
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
        new_sheet_name = request.form['sheet_name']
        project_id = request.form['pid']
        project_config_path = get_project_config_path(user_id, project_id)
        project = Project(project_config_path)
        data_file_id, current_sheet_name = project.get_current_file_and_sheet()
        data_file_path = str(Path.cwd() / "config" / "uploads" / user_id / project_id / "df" / data_file_id)
        data = excel_to_json(data_file_path, new_sheet_name)
        table_data = response["tableData"]
        table_data["filename"] = project.get_file_name_by_id(data_file_id)
        table_data["isCSV"] = False # because CSVs don't have sheets
        table_data["sheetNames"] = data["sheetNames"]
        table_data["currSheetName"] = data["currSheetName"]
        table_data["sheetData"] = data["sheetData"]
        project_meta["currentSheetName"] = data["currSheetName"]

        add_excel_file_to_bindings(data_file_path, new_sheet_name)
        region_map, region_file_name = get_region_mapping(user_id, project_id, project, data_file_id, new_sheet_name)
        item_table = ItemTable(region_map)
        wikifier_output_filepath = str(Path.cwd() / "config" / "uploads" / user_id / project_id / "wf" / "other.csv")
        serialized_wikifier_output_filepath = str(Path.cwd() / "config" / "uploads" / user_id / project_id / "wf" / "result.csv")

        if Path(wikifier_output_filepath).exists():
            process_wikified_output_file(wikifier_output_filepath, item_table, data_file_path, new_sheet_name)
        sparql_endpoint = project.get_sparql_endpoint()
        serialized_table = item_table.serialize_table(sparql_endpoint)
        save_wikified_result(serialized_table['rowData'], serialized_wikifier_output_filepath)
        response["wikifierData"] = serialized_table
        response['wikifiedOutputFilepath'] = serialized_wikifier_output_filepath
        project_meta["wikifierRegionMapping"] = dict()
        project_meta["wikifierRegionMapping"][data_file_id] = dict()
        project_meta["wikifierRegionMapping"][data_file_id][new_sheet_name] = region_file_name
        item_table_as_json = item_table.to_json()
        update_wikifier_region_file(user_id, project_id, region_file_name, item_table_as_json)

        yaml_file_id = project.get_yaml_file_id(data_file_id, new_sheet_name)
        if yaml_file_id:
            response["yamlData"] = dict()
            yaml_file_name = yaml_file_id + ".yaml"
            yaml_file_path = str(Path.cwd() / "config" / "uploads" / user_id / project_id / "yf" / yaml_file_name)
            response["yamlData"]["yamlFileContent"] = read_file(yaml_file_path)
            if data_file_id:
                yaml_config_file_name = yaml_file_id + ".pickle"
                yaml_config_file_path = str(
                    Path.cwd() / "config" / "uploads" / user_id / project_id / "yf" / yaml_config_file_name)
                data_file_path = str(Path(app.config['UPLOAD_FOLDER']) / user_id / project_id / "df" / data_file_id)

                yaml_config = load_yaml_config(yaml_config_file_path)
                template = yaml_config.get_template()
                region = yaml_config.get_region()
                response["yamlData"]['yamlRegions'] = highlight_region(item_table, data_file_path, new_sheet_name, region, template)
                project_meta["yamlMapping"] = dict()
                project_meta["yamlMapping"][data_file_id] = dict()
                project_meta["yamlMapping"][data_file_id][data["currSheetName"]] = yaml_file_id
        else:
            response["yamlData"] = None
        project.update_project_config(project_meta)
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
        project_meta = dict()
        error = wikified_output_uploader(user_id, project_id)
        project_config_path = get_project_config_path(user_id, project_id)
        project = Project(project_config_path)
        file_name, sheet_name = project.get_current_file_and_sheet()
        sparql_endpoint = project.get_sparql_endpoint()
        if file_name:
            region_map, region_file_name = get_region_mapping(user_id, project_id, project, file_name, sheet_name)
            item_table = ItemTable(region_map)
            wikifier_output_filepath = str(Path.cwd() / "config" / "uploads" / user_id / project_id / "wf" / "other.csv")
            data_filepath = str(Path.cwd() / "config" / "uploads" / user_id / project_id / "df" / file_name)
            serialized_wikifier_output_filepath = str(Path.cwd() / "config" / "uploads" / user_id / project_id / "wf" / "result.csv")
            process_wikified_output_file(wikifier_output_filepath, item_table, data_filepath, sheet_name)
            serialized_table = item_table.serialize_table(sparql_endpoint)
            response.update(serialized_table)
            item_table_as_json = item_table.to_json()
            update_wikifier_region_file(user_id, project_id, region_file_name, item_table_as_json)
            save_wikified_result(serialized_table['rowData'], serialized_wikifier_output_filepath)
            response['wikifiedOutputFilepath'] = serialized_wikifier_output_filepath
            project_meta["wikifierRegionMapping"] = dict()
            project_meta["wikifierRegionMapping"][file_name] = dict()
            project_meta["wikifierRegionMapping"][file_name][sheet_name] = region_file_name
        if error:
            response['error'] = error
        else:
            response['error'] = None
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
    project_meta = dict()
    project_config_path = get_project_config_path(user_id, project_id)
    project = Project(project_config_path)
    data_file_name, sheet_name = project.get_current_file_and_sheet()
    yaml_configuration = YAMLFile()
    data_file_path = str(Path.cwd() / "config" / "uploads" / user_id / project_id / "df" / data_file_name)
    add_row_in_data_file(data_file_path, sheet_name)
    response = {'error': None}
    if check_if_string_is_invalid(yaml_data):
        error = dict()
        error["errorCode"] = "T2WMLException.InvalidYAMLFile"
        error["errorTitle"] = T2WMLException.InvalidYAMLFile.value
        error["errorDescription"] = "YAML file is either empty or not valid"
        response['error'] = error
    else:
        yaml_file_id = project.get_yaml_file_id(data_file_name, sheet_name)
        if not yaml_file_id:
            yaml_file_id = generate_id()
        yaml_file_name = yaml_file_id + ".yaml"
        yaml_config_file_name = yaml_file_id + ".pickle"
        yaml_config_file_path = str(
            Path.cwd() / "config" / "uploads" / user_id / project_id / "yf" / yaml_config_file_name)
        yaml_file_path = str(Path.cwd() / "config" / "uploads" / user_id / project_id / "yf" / yaml_file_name)
        with open(yaml_file_path, "w", newline='') as f:
            f.write(yaml_data)
            yaml_configuration.set_file_location(yaml_file_path)
        project.add_yaml_file(data_file_name, sheet_name, yaml_file_id)
        sparql_endpoint = project.get_sparql_endpoint()
        validation_response = validate_yaml(yaml_file_path, sparql_endpoint)
        try:
            if not validation_response:
                if data_file_name:
                    wikifier_config_file_name = project.get_or_create_wikifier_region_filename(data_file_name, sheet_name)
                    wikifier_config = deserialize_wikifier_config(user_id, project_id, wikifier_config_file_name)
                    item_table = ItemTable(wikifier_config)
                    region, template, created_by = load_yaml_data(yaml_file_path, item_table, data_file_path, sheet_name)
                    yaml_configuration.set_region(region)
                    yaml_configuration.set_template(template)
                    yaml_configuration.set_created_by(created_by)
                    save_yaml_config(yaml_config_file_path, yaml_configuration)
                    template = yaml_configuration.get_template()
                    response['yamlRegions'] = highlight_region(item_table, data_file_path, sheet_name, region, template)
                    project_meta["yamlMapping"] = dict()
                    project_meta["yamlMapping"][data_file_name] = dict()
                    project_meta["yamlMapping"][data_file_name][sheet_name] = yaml_file_id
                    project.update_project_config(project_meta)
                else:
                    response['yamlRegions'] = None
                    error = dict()
                    error["errorCode"] = "T2WMLException.YAMLEvaluatedWithoutDataFile"
                    error["errorTitle"] = T2WMLException.YAMLEvaluatedWithoutDataFile.value
                    error["errorDescription"] = "Upload data file before applying YAML."
                    response['error'] = error
            else:
                response['yamlRegions'] = None
                response["error"] = validation_response
        except Exception as exception:
            response['yamlRegions'] = None
            error = dict()
            error["errorCode"], error["errorTitle"], error["errorDescription"] = exception.args
            response["error"] = error
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
        yaml_config_file_path = str(
            Path.cwd() / "config" / "uploads" / user_id / project_id / "yf" / yaml_config_file_name)
        yaml_config = load_yaml_config(yaml_config_file_path)
        data_file_path = str(Path.cwd() / "config" / "uploads" / user_id / project_id / "df" / data_file_name)
        template = yaml_config.get_template()
        region = yaml_config.get_region()
        region_map, region_file_name = get_region_mapping(user_id, project_id, project)
        item_table = ItemTable(region_map)
        sparql_endpoint = project.get_sparql_endpoint()
        data = resolve_cell(item_table, data_file_path, sheet_name, region, template, column, row, sparql_endpoint)
    else:
        data = dict()
        error = dict()
        error["errorCode"] = "T2WMLException.CellResolutionWithoutYAMLFile"
        error["errorTitle"] = T2WMLException.CellResolutionWithoutYAMLFile.value
        error["errorDescription"] = "Upload YAML file before resolving cell."
        data['error'] = error

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
    created_by = yaml_config.get_created_by()

    region_map, region_file_name = get_region_mapping(user_id, project_id, project)
    item_table = ItemTable(region_map)
    sparql_endpoint = project.get_sparql_endpoint()
    response = generate_download_file(user_id, item_table, data_file_path, sheet_name, region, template, filetype,
                                      sparql_endpoint, created_by=created_by)
    return json.dumps(response, indent=3)


@app.route('/update_settings', methods=['POST'])
def update_settings():
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
    context = request.form["context"]
    flag = int(request.form["flag"])
    project_config_path = get_project_config_path(user_id, project_id)
    project = Project(project_config_path)
    data_file_name, sheet_name = project.get_current_file_and_sheet()
    data_file_path = str(Path.cwd() / "config" / "uploads" / user_id / project_id / "df" / data_file_name)
    region_map, region_file_name = get_region_mapping(user_id, project_id, project)
    item_table = ItemTable(region_map)
    data = dict()
    sparql_endpoint = project.get_sparql_endpoint()
    if action == "wikify_region":
        if not data_file_path:
            error = dict()
            error["errorCode"] = "T2WMLException.WikifyWithoutDataFile"
            error["errorTitle"] = T2WMLException.WikifyWithoutDataFile.value
            error["errorDescription"] = "Upload data file before wikifying a region"
            data['error'] = error
        else:
            wikifier(item_table, region, data_file_path, sheet_name, flag, context, sparql_endpoint)
            item_table_as_json = item_table.to_json()
            wikifier_region_file_name = project.get_or_create_wikifier_region_filename()
            update_wikifier_region_file(user_id, project_id, wikifier_region_file_name, item_table_as_json)
            data = item_table.serialize_table(sparql_endpoint)
            serialized_wikifier_output_filepath = str(Path.cwd() / "config" / "uploads" / user_id / project_id / "wf" / "result.csv")
            save_wikified_result(data['rowData'], serialized_wikifier_output_filepath)
            data['wikifiedOutputFilepath'] = serialized_wikifier_output_filepath
    if 'error' not in data:
        data['error'] = None
    project_meta = dict()
    project_meta["wikifierRegionMapping"] = dict()
    project_meta["wikifierRegionMapping"][data_file_name] = dict()
    project_meta["wikifierRegionMapping"][data_file_name][sheet_name] = region_file_name
    project.update_project_config(project_meta)
    return json.dumps(data, indent=3)


@app.route('/get_project_files', methods=['POST'])
def get_project_files():
    """
    This function fetches the last session of the last opened files in a project when that project is reopened later.
    :return:
    """
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
        sparql_endpoint = project.get_sparql_endpoint()
        data_file_id, sheet_name = project.get_current_file_and_sheet()
        if data_file_id:
            file_extension = get_file_extension(data_file_id)
            response["tableData"] = dict()
            response["tableData"]["isCSV"] = True if file_extension.lower() == "csv" else False
            response["tableData"]["filename"] = project.get_file_name_by_id(data_file_id)
            data_file_path = str(Path(app.config['UPLOAD_FOLDER']) / user_id / project_id / "df" / data_file_id)
            response["tableData"].update(excel_to_json(data_file_path, sheet_name, True))
            if response["tableData"]["isCSV"]:
                response["tableData"]["currSheetName"] = None
                response["tableData"]["sheetNames"] = None
        else:
            response["tableData"] = None
        wikifier_config_file_name = project.get_wikifier_region_filename()
        if wikifier_config_file_name:
            wikifier_config = deserialize_wikifier_config(user_id, project_id, wikifier_config_file_name)
            item_table = ItemTable(wikifier_config)
            serialized_item_table = item_table.serialize_table(sparql_endpoint)
            response["wikifierData"] = serialized_item_table
            serialized_wikifier_output_filepath = str(Path.cwd() / "config" / "uploads" / user_id / project_id / "wf" / "result.csv")
            response['wikifiedOutputFilepath'] = serialized_wikifier_output_filepath
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
    """
    This function initiate request to end a user's session and logs them out.
    :return:
    """
    if 'uid' in session:
        del session['uid']
    return redirect(url_for('index'))


@app.route('/rename_project', methods=['POST'])
def rename_project():
    """
    This route is used to rename a project.
    :return:
    """
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
    """
    This route is used to delete a project.
    :return:
    """
    if 'uid' in session:
        user_id = session['uid']
        project_id = request.form["pid"]
        project_directory = Path(app.config['UPLOAD_FOLDER']) / session['uid'] / project_id

        shutil.rmtree(project_directory)
        user_dir = Path(app.config['UPLOAD_FOLDER']) / user_id
        project_details = get_project_details(user_dir)
    else:
        project_details = None
    project_details_json = json.dumps(project_details)
    return project_details_json


if __name__ == "__main__":
    if len(sys.argv) > 1:
        if sys.argv[1] == '--debug':
            debug_mode = True
            print('Debug mode is on!')
    app.run(threaded=True)
