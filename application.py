import shutil
import sys
import json
from app_config import app
from flask import request, render_template, redirect, url_for, session, make_response
from backend_code.models import User, Project, ProjectFile, YamlFile, WikiRegionFile
from backend_code.utility_functions import verify_google_login, check_if_string_is_invalid, validate_yaml
from backend_code.spreadsheets.conversions import  column_letter_to_index, one_index_to_zero_index
from backend_code.handler import generate_download_file, wikifier
from backend_code import t2wml_exceptions as T2WMLExceptions
from backend_code.t2wml_exceptions import make_frontend_err_dict, T2WMLException

ALLOWED_EXCEL_FILE_EXTENSIONS = {'xlsx', 'xls', 'csv'}
debug_mode = False

class UserNotFoundException(Exception):
    pass

def get_template_path(filename: str):
    return (filename if not debug_mode else '{}_dev'.format(filename)) + '.html'

def get_user():
    if 'uid' not in session:
        raise UserNotFoundException

    user_id = session['uid']
    try:
        u=User.get_or_create(user_id)
        assert isinstance(u, User) #safety guard against weirdness
        return u
    except:
        del session['uid']
        raise UserNotFoundException

def get_project():
    user_id = session['uid']
    project_id = request.form['pid']
    project = Project.query.get(project_id)
    if project.user_id!=user_id:
        raise ValueError("unauthenticated project access")
    return project

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

def file_upload_validator():
    in_file=None
    if 'file' not in request.files:
        raise T2WMLExceptions.NoFilePartException("Missing 'file' parameter in the data file upload request")

    in_file = request.files['file']
    if in_file.filename == '':
        raise T2WMLExceptions.BlankFileNameException("No data file selected for uploading")
    
    if not (in_file and is_file_allowed(in_file.filename)):
        raise T2WMLExceptions.FileTypeNotSupportedException("File with extension '" + get_file_extension(in_file.filename) + "' is not a valid data file")
    
    return in_file
    


def wikified_output_validator():
    """
    This function helps in processing the wikifier output file upload request
    :param uid:
    :param pid:
    :return:
    """
    in_file=None
    if 'wikifier_output' not in request.files:
        raise T2WMLExceptions.NoFilePartException("Missing 'file' parameter in the wikified output file upload request")
    in_file = request.files['wikifier_output']
    if in_file.filename == '':
        raise T2WMLExceptions.BlankFileNameException("No wikified output file selected for uploading")

    if not (in_file and is_file_allowed(in_file.filename, "csv")):
        raise T2WMLExceptions.FileTypeNotSupportedException("File with extension '" + 
                        get_file_extension(in_file.filename) + "' is not a valid wikified output file")
    return in_file

@app.route('/userinfo', methods=['GET'])
def user_info():
    user=get_user()
    return json.dumps(user.json_dict)

@app.route('/', methods=['GET'])
def index():
    """
    This functions renders the GUI
    :return:
    """
    try:
        get_user()
        return redirect(url_for('project_home'))
    except:
        return render_template(get_template_path('login'))


@app.route('/login', methods=['POST'])
def login():
    """
    This function verifies the oath token and returns the authorization response
    :return:
    """
    verification_status = False
    try:
        response = {"vs": None, 'error': None}
        if 'token' in request.form and 'source' in request.form:
            token = request.form['token']
            source = request.form['source']
            user_info, error = verify_google_login(token)
            if user_info:
                if source == "Google":
                    user_id = "G"+user_info["sub"]
                    u=User.get_or_create(user_id, **user_info)
                    session['uid'] = u.uid
                    verification_status = True
        else:
            if 'token' in request.form and 'source' not in request.form:
                raise T2WMLExceptions.InvalidRequestException( "Missing 'source' parameter in the login request")
            elif 'token' not in request.form and 'source' in request.form:
                raise T2WMLExceptions.InvalidRequestException("Missing 'token' parameter in the login request")
            elif 'token' not in request.form and 'source' not in request.form:
                raise T2WMLExceptions.InvalidRequestException("Missing 'token' and 'source' parameters in the login request")
        response["vs"] = verification_status
        return json.dumps(response)
    except T2WMLException as e:
        response["error"]=e.error_dict
        response["vs"] = False
    except Exception as e:
        response["error"]=make_frontend_err_dict(e)
        response["vs"] = False


@app.route('/project/<string:pid>', methods=['GET'])
def open_project(pid: str):
    """
    This route opens the project and displays data file viewer, YAML viewer and Wikified output file viewer cards.
    :param pid:
    :return:
    """
    try:
        get_user()
        return app.make_response(render_template(get_template_path('project')))
    except UserNotFoundException:
         return redirect(url_for('index'))


@app.route('/project', methods=['GET'])
def project_home():
    """
    This route displays the list of projects with their details and gives user the option to rename, delete and download the project.
    :return:
    """
    try:
        get_user()
        return make_response(render_template(get_template_path('home')))
    except UserNotFoundException:
        return redirect(url_for('index'))


@app.route('/get_project_meta', methods=['POST'])
def get_project_meta():
    """
    This route is used to fetch details of all the projects viz. project title, project id, modified date etc.
    :return:
    """
    data={
        'projects':None,
        'error':None
    }
    try:
        user=get_user()
        data['projects']=user.get_project_details()
        project_details_json = json.dumps(data)
        return project_details_json
    except UserNotFoundException:
        return json.dumps(None)


@app.route('/create_project', methods=['POST'])
def create_project():
    """
    This route creates a project by generating a unique id and creating a upload directory for that project
    :return:
    """
    try:
        user=get_user()
        response = dict()
        if 'ptitle' in request.form:
            project_title = request.form['ptitle']
            project= Project.create(user.uid, project_title)
            response['pid'] = project.id
            response_json = json.dumps(response)
            return response_json
    except UserNotFoundException:
        return json.dumps(None)
    


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
        try:
            new_file=file_upload_validator()
            project_file=ProjectFile.create(new_file, session['uid'], request.form['pid'])
            project_file.set_as_current()
            response["tableData"]=project_file.tableData()
            current_sheet=project_file.current_sheet

            w=WikiRegionFile.get_or_create(current_sheet)
            response["wikifierData"]=w.handle()
            response['wikifiedOutputFilepath'] = w.serialized_wikifier_output_filepath

            y=YamlFile.get_handler(current_sheet)
            response["yamlData"]=y

        except T2WMLException as e:
            response["error"]=e.error_dict
        except Exception as e:
            response["error"]=make_frontend_err_dict(e)

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
        
        try:
            new_sheet_name = request.form['sheet_name']
            project=get_project()
            project_file=project.current_file
            project_file.change_sheet(new_sheet_name)
            
            response["tableData"]=project_file.tableData()

            current_sheet=project_file.current_sheet

            w=WikiRegionFile.get_or_create(current_sheet)
            response["wikifierData"]=w.handle()
            response['wikifiedOutputFilepath'] = w.serialized_wikifier_output_filepath

            y=YamlFile.get_handler(current_sheet)
            response["yamlData"]=y
        
        except T2WMLException as e:
            response["error"]=e.error_dict
        except Exception as e:
            response["error"]=make_frontend_err_dict(e)
        return json.dumps(response, indent=3)


@app.route('/upload_wikifier_output', methods=['POST'])
def upload_wikifier_output():
    """
    This function uploads the wikifier output
    :return:
    """
    if 'uid' in session:
        response={"error":None}
        try:
            in_file = wikified_output_validator()
            project=get_project()
            project.change_wikifier_file(in_file)
            if project.current_file:
                sheet=project.current_file.current_sheet
                w=WikiRegionFile.get_or_create(sheet)
                response.update(w.handle()) #does not go into field wikifierData but is dumped directly
                response['wikifiedOutputFilepath'] = w.serialized_wikifier_output_filepath
        except T2WMLException as e:
            response["error"]=e.error_dict
        except Exception as e:
            response["error"]=make_frontend_err_dict(e)
        return json.dumps(response, indent=3)


@app.route('/upload_yaml', methods=['POST'])
def upload_yaml():
    """
    This function process the yaml
    :return:
    """
    project=get_project()
    yaml_data = request.form["yaml"]
    response={"error":None,
            "yamlRegions":None}
    try:
        if check_if_string_is_invalid(yaml_data):
            raise T2WMLExceptions.InvalidYAMLFileException( "YAML file is either empty or not valid")
        else:
            if project.current_file:
                yf=YamlFile.get_or_create(project.current_file.current_sheet, yaml_data)
                validate_yaml(yf.yaml_file_path, project.sparql_endpoint)
                response['yamlRegions']=yf.highlight_region()
            else:
                response['yamlRegions'] = None
                raise T2WMLExceptions.YAMLEvaluatedWithoutDataFileException("Upload data file before applying YAML.")

    except T2WMLException as e:
        response["error"]=e.error_dict
    except Exception as e:
        response["error"]=make_frontend_err_dict(e)
    return json.dumps(response, indent=3)


@app.route('/resolve_cell', methods=['POST'])
def get_cell_statement():
    """
    This function returns the statement of a particular cell
    :return:
    """
    column = column_letter_to_index(request.form["col"])
    row = one_index_to_zero_index(request.form["row"])
    data={}
    try:
        project = get_project()
        yaml_file = project.current_file.current_sheet.yaml_file
        if not yaml_file:
            raise T2WMLExceptions.CellResolutionWithoutYAMLFileException("Upload YAML file before resolving cell.")
        data = yaml_file.resolve_cell(column, row)
    
    except T2WMLException as e:
        data["error"]=e.error_dict
    except Exception as e:
        data["error"]=make_frontend_err_dict(e)
    return json.dumps(data)


@app.route('/download', methods=['POST'])
def downloader():
    """
    This functions initiates the download
    :return:
    """
    project=get_project()
    project_file=project.current_file
    current_sheet=project_file.current_sheet

    filetype = request.form["type"]
    sparql_endpoint = project.sparql_endpoint
    user_id=project.user_id
    item_table=current_sheet.item_table
    data_file_path=project_file.filepath
    sheet_name=current_sheet.name
    
    yaml_file=current_sheet.yaml_file
    yaml_config=yaml_file.yaml_configuration

    template = yaml_config.template
    region = yaml_config.region
    created_by = yaml_config.created_by

    response = generate_download_file(user_id, item_table, data_file_path, sheet_name, region, template, filetype,
                                      sparql_endpoint, created_by=created_by)
    return json.dumps(response, indent=3)





@app.route('/call_wikifier_service', methods=['POST'])
def wikify_region():
    """
    This function perfoms three tasks; calls the wikifier service to wikifiy a region, delete a region's wikification result
    and update the wikification result.
    :return:
    """
    action = request.form["action"]
    region = request.form["region"]
    context = request.form["context"]
    flag = int(request.form["flag"])
    project = get_project()
    data = {"error":None}
    try:
        if action == "wikify_region":
            if not project.current_file:
                raise T2WMLExceptions.WikifyWithoutDataFileException("Upload data file before wikifying a region")
            current_sheet=project.current_file.current_sheet
            item_table = current_sheet.item_table
            #handler
            x=wikifier(item_table, region, project.current_file.filepath, current_sheet.name, flag, context, project.sparql_endpoint)
            
            wikier=WikiRegionFile.get_or_create(current_sheet)
            wikier.update_wikifier_region_file(item_table)
            data = wikier.serialize_and_save(item_table)

            data['wikifiedOutputFilepath'] = wikier.serialized_wikifier_output_filepath
    except T2WMLException as e:
        data["error"]=e.error_dict
    except Exception as e:
        data["error"]=make_frontend_err_dict(e)
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
        project=get_project()
        
        response["settings"]["endpoint"] = project.sparql_endpoint
        response['wikifiedOutputFilepath'] = project.serialized_wikifier_output_filepath

        project_file=project.current_file
        if project_file:
            response["tableData"]=project_file.tableData()
            item_table=project_file.current_sheet.item_table
            serialized_item_table = item_table.serialize_table(project.sparql_endpoint)
            response["wikifierData"] = serialized_item_table
			

            y=YamlFile.get_handler(project_file.current_sheet)
            response["yamlData"]=y

    response_json = json.dumps(response)
    return response_json



@app.route('/delete_project', methods=['POST'])
def delete_project():
    """
    This route is used to delete a project.
    :return:
    """
    data={
        'projects':None,
        'error':None
    }
    try:
        user=get_user()
        project_id = request.form["pid"]
        Project.delete(project_id)
        data['projects']=user.get_project_details()
        project_details_json = json.dumps(data)
        return project_details_json
    except UserNotFoundException:
        return json.dumps(None)




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
    try:
        data={
            'projects':None,
            'error':None
        }
        user=get_user()
        ptitle = request.form["ptitle"]
        project=get_project()
        project.update_project_title(ptitle)
        data['projects']=user.get_project_details()
    except UserNotFoundException:
        data=None
    except Exception as e:
        data["error"]=make_frontend_err_dict(e)
    project_details_json = json.dumps(data)
    return project_details_json
        



@app.route('/update_settings', methods=['POST'])
def update_settings():
    """
    This function updates the settings from GUI
    :return:
    """
    endpoint = request.form["endpoint"]
    project = get_project()
    project.update_sparql_endpoint(endpoint)
    return json.dumps(None)

if __name__ == "__main__":
    if len(sys.argv) > 1:
        if sys.argv[1] == '--debug':
            debug_mode = True
            print('Debug mode is on!')
        if sys.argv[1] == "--profile":
            from werkzeug.contrib.profiler import ProfilerMiddleware
            app.config['PROFILE'] = True
            app.wsgi_app = ProfilerMiddleware(app.wsgi_app, restrictions = [30])
            app.run(debug = True)
    app.run(threaded=True)
