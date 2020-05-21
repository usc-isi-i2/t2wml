import json
import shutil
import sys
import json
import os
from flask import request, render_template, redirect, url_for, session, make_response
from flask.helpers import send_file, send_from_directory
from werkzeug.exceptions import NotFound
from app_config import app
from backend_code.models import User, Project, ProjectFile, YamlFile, WikiRegionFile
from backend_code.utility_functions import string_is_valid, verify_google_login
from backend_code.wikify_handling import wikifier
from backend_code import t2wml_exceptions as T2WMLExceptions
from backend_code.t2wml_exceptions import make_frontend_err_dict, T2WMLException
from backend_code.spreadsheets.caching import cache_settings

cache_settings["use_cache"]=True

ALLOWED_EXCEL_FILE_EXTENSIONS = {'xlsx', 'xls', 'csv'}
debug_mode = False

class UserNotFoundException(Exception):
    pass

class ProjectNotFoundException(Exception):
    pass

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
    user=get_user()
    try:
        project_id = request.form['pid']
        project = Project.query.get(project_id)
        if project.user_id!=user.uid:
            raise ValueError("unauthenticated project access")
        return project
    except:
        raise ProjectNotFoundException


def file_upload_validator(file_extensions=ALLOWED_EXCEL_FILE_EXTENSIONS):
    if 'file' not in request.files:
        raise T2WMLExceptions.NoFilePartException("Missing 'file' parameter in the file upload request")

    in_file = request.files['file']
    if in_file.filename == '':
        raise T2WMLExceptions.BlankFileNameException("No file selected for uploading")
    
    file_extension=in_file.filename.split(".")[-1].lower()
    file_allowed = file_extension in file_extensions
    if not file_allowed:
        raise T2WMLExceptions.FileTypeNotSupportedException("File with extension '"+file_extension+"' is not allowed")

    return in_file

def json_response(func):
    def wrapper(*args, **kwargs):
        try:
            data, return_code=func(*args, **kwargs)
            return json.dumps(data, indent=3), return_code
        except UserNotFoundException as e:
            return "", 401
        except ProjectNotFoundException as e:
            return "", 404
        except T2WMLException as e:
            data = {"error": e.error_dict} #error code from the exception
            return json.dumps(data, indent=3), e.code
        except Exception as e:
            data = {"error": make_frontend_err_dict(e)}
            return json.dumps(data, indent=3), 500
        
    wrapper.__name__ = func.__name__
    return wrapper    

@app.route('/api/userinfo', methods=['GET'])
@json_response
def user_info():
    user=get_user()
    return user.json_dict, 200


@app.route('/api/login', methods=['POST'])
@json_response
def login():
    """
    This function verifies the oath token and returns the authorization response
    :return:
    """
    verification_status = False
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
        raise T2WMLExceptions.InvalidRequestException("Missing 'token' and/or 'source' parameters in the login request")
    response["vs"] = verification_status
    return response, 200


@app.route('/api/get_project_meta', methods=['POST'])
@json_response
def get_project_meta():
    """
    This route is used to fetch details of all the projects viz. project title, project id, modified date etc.
    :return:
    """
    user=get_user()
    data={
        'projects':None,
        'error':None
    }
    data['projects']=user.get_project_details()
    return data, 200



@app.route('/api/create_project', methods=['POST'])
@json_response
def create_project():
    """
    This route creates a project by generating a unique id and creating a upload directory for that project
    :return:
    """
    user=get_user()
    response = dict()
    if 'ptitle' in request.form:
        project_title = request.form['ptitle']
        project= Project.create(user.uid, project_title)
        response['pid'] = project.id
        return response, 201

    


@app.route('/api/upload_data_file', methods=['POST'])
@json_response
def upload_data_file():
    """
    This function uploads the data file
    :return:
    """
    project=get_project()
    response = {
                    "tableData": dict(),
                    "wikifierData": dict(),
                    "yamlData": dict(),
                    "error": None
                }
    new_file=file_upload_validator()
    project_file=ProjectFile.create(new_file, project)
    project_file.set_as_current()
    response["tableData"]=project_file.tableData()
    current_sheet=project_file.current_sheet

    w=WikiRegionFile.get_or_create(current_sheet)
    response["wikifierData"]=w.handle()


    y=YamlFile.get_handler(current_sheet)
    response["yamlData"]=y
    return response, 200



@app.route('/api/change_sheet', methods=['POST'])
@json_response
def change_sheet():
    """
    This route is used when a user switches a sheet in an excel data file.
    :return:
    """
    project=get_project()
    response = {
                "tableData": dict(),
                "wikifierData": dict(),
                "yamlData": dict(),
                "error": None
            }
    
    new_sheet_name = request.form['sheet_name']
    project_file=project.current_file
    project_file.change_sheet(new_sheet_name)
    
    response["tableData"]=project_file.tableData()

    current_sheet=project_file.current_sheet

    w=WikiRegionFile.get_or_create(current_sheet)
    response["wikifierData"]=w.handle()


    y=YamlFile.get_handler(current_sheet)
    response["yamlData"]=y

    return response, 200


@app.route('/api/upload_wikifier_output', methods=['POST'])
@json_response
def upload_wikifier_output():
    """
    This function uploads the wikifier output
    :return:
    """
    project=get_project()
    response={"error":None}
    in_file = file_upload_validator("csv")
    project.change_wikifier_file(in_file)
    if project.current_file:
        sheet=project.current_file.current_sheet
        w=WikiRegionFile.get_or_create(sheet)
        response.update(w.handle()) #does not go into field wikifierData but is dumped directly


    return response, 200


@app.route('/api/upload_yaml', methods=['POST'])
@json_response
def upload_yaml():
    """
    This function process the yaml
    :return:
    """
    project=get_project()
    yaml_data = request.form["yaml"]
    response={"error":None,
            "yamlRegions":None}
    if not string_is_valid(yaml_data):
        raise T2WMLExceptions.InvalidYAMLFileException( "YAML file is either empty or not valid")
    else:
        if project.current_file:
            yf=YamlFile.create(project.current_file.current_sheet, yaml_data)
            response['yamlRegions']=yf.highlight_region()
        else:
            response['yamlRegions'] = None
            raise T2WMLExceptions.YAMLEvaluatedWithoutDataFileException("Upload data file before applying YAML.")

    return response, 200


@app.route('/api/resolve_cell', methods=['POST'])
@json_response
def get_cell_statement():
    """
    This function returns the statement of a particular cell
    :return:
    """
    project = get_project()
    column = request.form["col"]
    row = request.form["row"]
    data={}
    yaml_file = project.current_file.current_sheet.yaml_file
    if not yaml_file:
        raise T2WMLExceptions.CellResolutionWithoutYAMLFileException("Upload YAML file before resolving cell.")
    data = yaml_file.resolve_cell(column, row)
    return data, 200


@app.route('/api/download', methods=['POST'])
@json_response
def downloader():
    """
    This functions initiates the download
    :return:
    """
    project = get_project()
    yaml_file = project.current_file.current_sheet.yaml_file
    if not yaml_file: #the frontend disables this, this is just another layer of checking
        raise T2WMLExceptions.CellResolutionWithoutYAMLFileException("Cannot download report without uploading YAML file first")

    filetype = request.form["type"]

    response = yaml_file.generate_download_file(filetype)
    return response, 200





@app.route('/api/call_wikifier_service', methods=['POST'])
@json_response
def wikify_region():
    """
    This function perfoms three tasks; calls the wikifier service to wikifiy a region, delete a region's wikification result
    and update the wikification result.
    :return:
    """
    project = get_project()
    action = request.form["action"]
    region = request.form["region"]
    context = request.form["context"]
    flag = int(request.form["flag"])
    data = {"error":None}
    if action == "wikify_region":
            if not project.current_file:
                raise T2WMLExceptions.WikifyWithoutDataFileException("Upload data file before wikifying a region")
            current_sheet=project.current_file.current_sheet
            item_table = current_sheet.item_table
            #handler
            x=wikifier(item_table, region, project.current_file.file_path, current_sheet.name, flag, context, project.sparql_endpoint)
            
            wikier=WikiRegionFile.get_or_create(current_sheet)
            wikier.update_wikifier_region_file(item_table)
            data = wikier.serialize_and_save(item_table)

    return data, 200


@app.route('/api/get_project_files', methods=['POST'])
@json_response
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
    project=get_project()
    
    response["settings"]["endpoint"] = project.sparql_endpoint

    project_file=project.current_file
    if project_file:
        response["tableData"]=project_file.tableData()
        item_table=project_file.current_sheet.item_table
        serialized_item_table = item_table.serialize_table(project.sparql_endpoint)
        response["wikifierData"] = serialized_item_table
        

        y=YamlFile.get_handler(project_file.current_sheet)
        response["yamlData"]=y

    return response, 200



@app.route('/api/delete_project', methods=['POST'])
@json_response
def delete_project():
    """
    This route is used to delete a project.
    :return:
    """
    data={
        'projects':None,
        'error':None
    }
    
    user=get_user()
    project_id = request.form["pid"]
    Project.delete(project_id)
    data['projects']=user.get_project_details()
    return data, 200





@app.route('/api/logout', methods=['GET'])
@json_response
def logout():
    """
    This function initiate request to end a user's session and logs them out.
    :return:
    """
    if 'uid' in session:
        del session['uid']
    return '', 204

@app.route('/api/rename_project', methods=['POST'])
@json_response
def rename_project():
    """
    This route is used to rename a project.
    :return:
    """
    user=get_user()
    data={
        'projects':None,
        'error':None
    }
    ptitle = request.form["ptitle"]
    project=get_project()
    project.update_project_title(ptitle)
    data['projects']=user.get_project_details()
    return data, 200
        

@app.route('/api/update_settings', methods=['POST'])
@json_response
def update_settings():
    """
    This function updates the settings from GUI
    :return:
    """
    project = get_project()
    endpoint = request.form["endpoint"]
    project.update_sparql_endpoint(endpoint)
    return None, 200 #can become 204 eventually, need to check frontend compatibility

# We want to serve the static files in case the t2wml is deployed as a stand-alone system.
# In that case, we only have one webserver - Flask. The following two routes are for this.
# They are not used in dev (React's dev server is used to serve frontend assets), or in server deployment
# (nginx is used to serve static assets)
@app.route('/')
def serve_home_page():
    return send_file(os.path.join(app.config['STATIC_FOLDER'], 'index.html'))

@app.route('/<path:path>')
def serve_static(path):
    try:
        return send_from_directory(app.config['STATIC_FOLDER'], path)
    except NotFound:
        return serve_home_page()


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
