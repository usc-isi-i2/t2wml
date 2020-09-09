import json
import os
import sys
from pathlib import Path
from flask import request

from t2wml.utils.t2wml_exceptions import T2WMLException
from t2wml.api import Project as apiProject
from t2wml.api import add_nodes_from_file
import web_exceptions
from app_config import app
from models import (DataFile, ItemsFile, Project,
                    PropertiesFile, WikifierFile, YamlFile)

from t2wml_web import (download, get_cell, handle_yaml, serialize_item_table,
                       highlight_region, update_t2wml_settings, wikify)
from utils import (file_upload_validator, get_project_details, get_qnode_label,
                   make_frontend_err_dict, string_is_valid, table_data)
from web_exceptions import WebException
from t2wml_annotation_integration import AnnotationIntegration
from calc_params import CalcParams

debug_mode = False


def get_project(project_id):
    try:
        project=Project.get(project_id)
    except Exception as e:
        raise web_exceptions.ProjectNotFoundException
    update_t2wml_settings(project)
    return project

def get_calc_params(project):    
    data_file = project.current_file
    if data_file:
        sheet = data_file.current_sheet
        if sheet.yaml_file:
            yaml_file=sheet.yaml_file.file_path
        else:
            yaml_file=None
        if project.wikifier_file:
            wikifier_files=[project.wikifier_file.file_path]
        else:
            wikifier_files=None
        calc_params=CalcParams(project.directory, data_file.file_path, sheet.name, yaml_file, wikifier_files)
        return calc_params
    return None



def json_response(func):
    def wrapper(*args, **kwargs):
        try:
            data, return_code = func(*args, **kwargs)
            return json.dumps(data, indent=3), return_code
        except WebException as e:
            data = {"error": e.error_dict}
            return json.dumps(data, indent=3), e.code
        except T2WMLException as e:
            print(e.detail_message)
            data = {"error": e.error_dict}  # error code from the exception
            return json.dumps(data, indent=3), e.code
        except Exception as e:
            print(str(e))
            data = {"error": make_frontend_err_dict(e)}
            return json.dumps(data, indent=3), 500

    wrapper.__name__ = func.__name__  # This is required to avoid issues with flask
    return wrapper


@app.route('/api/projects', methods=['GET'])
@json_response
def get_project_meta():
    """
    This route is used to fetch details of all the projects viz. project title, project id, modified date etc.
    :return:
    """
    data = {
        'projects': None,
        'error': None
    }
    data['projects'] = get_project_details()
    return data, 200


@app.route('/api/project', methods=['POST'])
@json_response
def create_project():
    """
    This route creates a project
    :return:
    """

    directory = request.form['path']
    #check we're not overwriting existing project
    project_file = Path(directory) / ".t2wmlproj"
    if project_file.is_file():
        raise web_exceptions.ProjectAlreadyExistsException(directory)
    #create project
    api_proj=apiProject(directory)
    api_proj.title=Path(directory).stem
    api_proj.save()
    #...and the database id for it
    project = Project.load(api_proj)
    response=dict(pid = project.id)
    response['project']=api_proj.__dict__

    return response, 201


@app.route('/api/project/load', methods=['POST'])
@json_response
def load_project():
    """
    This route loads an existing project
    :return:
    """
    path=request.form['path']
    project=Project.query.filter_by(file_directory=path).first()
    if not project:
        proj=apiProject.load(path)
        project=Project.load(proj)
    else:
        project.create_project_file()
    response ={"pid":project.id}
    response['project']=project.api_project.__dict__
    return response, 201



@app.route('/api/project/<pid>', methods=['GET'])
@json_response
def get_project_files(pid):
    """
    This function fetches the last session of the last opened files in a project when that project is reopened later.
    :return:
    """
    project = get_project(pid)
    response = {
        "tableData": None,
        "yamlData": None,
        "wikifierData": None,
    }

    response["name"] = project.name

    calc_params=get_calc_params(project)
    if calc_params:
        response["tableData"] = table_data(calc_params)
        response["wikifierData"] = serialize_item_table(calc_params)
        response["yamlData"] = handle_yaml(calc_params)
    response['project']=project.api_project.__dict__
    return response, 200


@app.route('/api/project/<pid>/wikidata', methods=['POST'])
@json_response
def add_item_definitions(pid):
    project = get_project(pid)
    in_file = file_upload_validator({"tsv"})
    pf = PropertiesFile.create(project, in_file)
    return_dict = add_nodes_from_file(pf.file_path)
    response = {"widget":return_dict}
    calc_params=get_calc_params(project)
    if calc_params:
        serialized_item_table = serialize_item_table(calc_params)
        response.update(serialized_item_table)
    response['project']=project.api_project.__dict__
    return response, 200





@app.route('/api/qnode/<pid>/<qid>', methods=['GET'])
@json_response
def get_qnode_info(pid, qid):
    project = get_project(pid)
    label = get_qnode_label(qid, project.sparql_endpoint)
    return {"label": label}, 200


@app.route('/api/data/<pid>', methods=['POST'])
@json_response
def upload_data_file(pid):
    """
    This function uploads the data file
    :return:
    """
    project = get_project(pid)
    response = {
        "tableData": dict(),
        "wikifierData": dict(),
        "yamlData": dict(),  # this is never not empty
        "error": None
    }
    new_file = file_upload_validator({'xlsx', 'xls', 'csv'})
    data_file = DataFile.create(project, new_file)
    calc_params=get_calc_params(project)
    response["tableData"] = table_data(calc_params)
    response["wikifierData"] = serialize_item_table(calc_params)
    response["yamlData"] = handle_yaml(calc_params)
    response['project']=project.api_project.__dict__
    return response, 200


@app.route('/api/data/<pid>/<sheet_name>', methods=['GET'])
@json_response
def change_sheet(pid, sheet_name):
    """
    This route is used when switching a sheet in an excel data file.
    :return:
    """
    project = get_project(pid)
    response = {
        "tableData": dict(),
        "wikifierData": dict(),
        "yamlData": dict(),
        "error": None
    }

    data_file = project.current_file
    old_sheet = data_file.current_sheet
    data_file.change_sheet(sheet_name)
    try:
        calc_params=get_calc_params(project)
        response["tableData"] = table_data(calc_params)
    except Exception as e:  # otherwise we can end up stuck on a corrupted sheet
        data_file.change_sheet(old_sheet.name)
        raise e

    #stopgap measure. we seriously need to separate these calls
    try:
        response["wikifierData"] = serialize_item_table(calc_params)
    except:
        pass #return blank

    try:
        response["yamlData"] = handle_yaml(calc_params)
    except:
        pass #return blank

    return response, 200


@app.route('/api/wikifier/<pid>', methods=['POST'])
@json_response
def upload_wikifier_output(pid):
    """
    This function uploads the wikifier output
    :return:
    """
    project = get_project(pid)
    response = {"error": None}
    in_file = file_upload_validator({"csv"})

    wikifier_file = WikifierFile.create(project, in_file)
    calc_params=get_calc_params(project)
    if calc_params:
        serialized_item_table = serialize_item_table(calc_params)
        # does not go into field wikifierData but is dumped directly
        response.update(serialized_item_table)
    response['project']=project.api_project.__dict__
    return response, 200


@app.route('/api/wikifier_service/<pid>', methods=['POST'])
@json_response
def wikify_region(pid):
    """
    This function calls the wikifier service to wikifiy a region, and deletes/updates wiki region file's results
    :return:
    """
    project = get_project(pid)
    action = request.form["action"]
    region = request.form["region"]
    context = request.form["context"]
    flag = int(request.form["flag"])
    if action == "wikify_region":
        if not project.current_file:
            raise web_exceptions.WikifyWithoutDataFileException(
                "Upload data file before wikifying a region")
        calc_params=get_calc_params(project)

        cell_qnode_map, problem_cells = wikify(calc_params, region, context)
        wf = WikifierFile.create_from_dataframe(project, cell_qnode_map)
        
        calc_params=get_calc_params(project)
        data = serialize_item_table(calc_params)

        if problem_cells:
            error_dict = {
                "errorCode": 400,
                "errorTitle": "Failed to wikify some cellsr",
                "errorDescription": "Failed to wikify: " + ",".join(problem_cells)
            }
            data['problemCells'] = error_dict
        else:
            data['problemCells'] = False
        data['project']=project.api_project.__dict__
        return data, 200
    return {}, 404

@app.route('/api/yaml/<pid>', methods=['POST'])
@json_response
def upload_yaml(pid):
    """
    This function uploads and processes the yaml file
    :return:
    """
    project = get_project(pid)
    yaml_data = request.form["yaml"]
    yaml_title = request.form["title"]
    response = {"error": None,
                "yamlRegions": None}
    if not string_is_valid(yaml_data):
        raise web_exceptions.InvalidYAMLFileException(
            "YAML file is either empty or not valid")
    else:
        if project.current_file:
            sheet = project.current_file.current_sheet
            yf = YamlFile.create_from_formdata(project, yaml_data, yaml_title, sheet)
            calc_params=get_calc_params(project)
            response['yamlRegions'] = highlight_region(calc_params)
        else:
            response['yamlRegions'] = None
            raise web_exceptions.YAMLEvaluatedWithoutDataFileException(
                "Upload data file before applying YAML.")
    response['project']=project.api_project.__dict__
    return response, 200


@app.route('/api/data/<pid>/cell/<col>/<row>', methods=['GET'])
@json_response
def get_cell_statement(pid, col, row):
    """
    This function returns the statement of a particular cell
    :return:
    """
    project = get_project(pid)
    data = {}

    calc_params=get_calc_params(project)
    if not calc_params.yaml_path:
        raise web_exceptions.CellResolutionWithoutYAMLFileException(
            "Upload YAML file before resolving cell.")
    data = get_cell(calc_params, col, row)
    return data, 200


@app.route('/api/project/<pid>/download/<filetype>', methods=['GET'])
@json_response
def downloader(pid, filetype):
    """
    This functions initiates the download
    :return:
    """
    project = get_project(pid)
    calc_params=get_calc_params(project)
    if not calc_params.yaml_path:  # the frontend disables this, this is just another layer of checking
        raise web_exceptions.CellResolutionWithoutYAMLFileException(
            "Cannot download report without uploading YAML file first")
    response = download(calc_params, filetype)
    return response, 200


@app.route('/api/project/<pid>', methods=['DELETE'])
@json_response
def delete_project(pid):
    """
    This route is used to delete a project.
    :return:
    """
    data = {
        'projects': None,
        'error': None
    }

    project = get_project(pid)
    Project.delete(project.id)
    data['projects'] = get_project_details()
    return data, 200


@app.route('/api/project/<pid>', methods=['PUT'])
@json_response
def rename_project(pid):
    """
    This route is used to rename a project.
    :return:
    """
    data = {
        'projects': None,
        'error': None
    }
    ptitle = request.form["ptitle"]
    project = get_project(pid)
    project.rename(ptitle)
    data['projects'] = get_project_details()
    return data, 200


@app.route('/api/project/<pid>/settings', methods=['PUT', 'GET'])
@json_response
def update_settings(pid):
    """
    This function updates the settings from GUI
    :return:
    """
    project = get_project(pid)
    project.update_settings(request.form)
    update_t2wml_settings(project)
    response = {
        "endpoint":project.sparql_endpoint,
        "warnEmpty":project.warn_for_empty_cells
    }
    return response, 200 



@app.route('/api/is-alive')
def is_alive():
    return 'Backend is here', 200


# We want to serve the static files in case the t2wml is deployed as a stand-alone system.
# In that case, we only have one webserver - Flask. The following two routes are for this.
# They are not used in dev (React's dev server is used to serve frontend assets), or in server deployment
# (nginx is used to serve static assets)
# @app.route('/')
# def serve_home_page():
#     return send_file(os.path.join(app.config['STATIC_FOLDER'], 'index.html'))


# @app.route('/<path:path>')
# def serve_static(path):
#     try:
#         return send_from_directory(app.config['STATIC_FOLDER'], path)
#     except NotFound:
#         return serve_home_page()


if __name__ == "__main__":
    if len(sys.argv) > 1:
        if sys.argv[1] == '--debug':
            debug_mode = True
            print('Debug mode is on!')
        if sys.argv[1] == "--profile":
            from werkzeug.middleware.profiler import ProfilerMiddleware
            from app_config import UPLOAD_FOLDER

            app.config['PROFILE'] = True
            profiles_dir = os.path.join(UPLOAD_FOLDER, "profiles")
            if not os.path.isdir(profiles_dir):
                os.mkdir(profiles_dir)
            app.wsgi_app = ProfilerMiddleware(app.wsgi_app, restrictions=[
                100], profile_dir=profiles_dir)
        app.run(debug=True, port=13000)
    else:
        app.run(threaded=True, port=13000)
