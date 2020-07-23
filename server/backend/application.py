import json
import os
import shutil
import sys
from pathlib import Path

from flask import (make_response, redirect, render_template, request, session,
                   url_for)
from flask.helpers import send_file, send_from_directory
from werkzeug.exceptions import NotFound

import web_exceptions
from app_config import app
from models import (DataFile, ItemsFile, Project, PropertiesFile, WikifierFile, YamlFile)
from t2wml.utils.t2wml_exceptions import T2WMLException
from t2wml_web import (download, get_cell, handle_yaml, serialize_item_table,
                       highlight_region, table_data, update_t2wml_settings,
                       wikify)
from utils import (file_upload_validator, get_project_details, get_qnode_label,
                    make_frontend_err_dict, string_is_valid, upload_item_defs)
from web_exceptions import WebException

debug_mode = False


def get_project(project_id):
    try:
        project = Project.query.get(project_id)
        update_t2wml_settings(project)
        return project
    except:
        raise web_exceptions.ProjectNotFoundException

def json_response(func):
    def wrapper(*args, **kwargs):
        try:
            data, return_code=func(*args, **kwargs)
            return json.dumps(data, indent=3), return_code
        except WebException as e:
            data = {"error": e.error_dict} 
            return json.dumps(data, indent=3), e.code
        except T2WMLException as e:
            print(e.detail_message)
            data = {"error": e.error_dict} #error code from the exception
            return json.dumps(data, indent=3), e.code
        except Exception as e:
            print(str(e))
            data = {"error": make_frontend_err_dict(e)}
            return json.dumps(data, indent=3), 500
        
    wrapper.__name__ = func.__name__ #This is required to avoid issues with flask
    return wrapper    


@app.route('/api/projects', methods=['GET'])
@json_response
def get_project_meta():
    """
    This route is used to fetch details of all the projects viz. project title, project id, modified date etc.
    :return:
    """
    data={
        'projects':None,
        'error':None
    }
    data['projects']=get_project_details()
    return data, 200


@app.route('/api/project', methods=['POST'])
@json_response
def create_project():
    """
    This route creates a project and an upload directory for that project
    :return:
    """
    response = dict()
    if 'ptitle' in request.form:
        project_title = request.form['ptitle']
        project= Project.create(project_title)
        response['pid'] = project.id
        return response, 201


@app.route('/api/project/<pid>', methods=['GET'])
@json_response
def get_project_files(pid):
    """
    This function fetches the last session of the last opened files in a project when that project is reopened later.
    :return:
    """
    project=get_project(pid)
    response = {
                "tableData": None,
                "yamlData": None,
                "wikifierData": None,
            }
    
    response["name"] = project.name

    data_file=project.current_file
    if data_file:
        sheet = data_file.current_sheet
        response["tableData"]=table_data(data_file, sheet_name=sheet.name)
        response["wikifierData"] = serialize_item_table(project, sheet)
        
        y=handle_yaml(sheet, project)
        response["yamlData"]=y

    return response, 200


@app.route('/api/project/<pid>/items', methods=['POST'])
@json_response
def add_item_definitions(pid):
    project = get_project(pid)
    in_file = file_upload_validator({"tsv"})
    i_f=ItemsFile.create(project, in_file)
    upload_item_defs(i_f.file_path)
    response={}
    if project.current_file:
        sheet=project.current_file.current_sheet
        serialized_item_table = serialize_item_table(project, sheet)
        response.update(serialized_item_table)
    return response, 200
    


@app.route('/api/project/<pid>/properties', methods=['POST'])
@json_response
def upload_properties(pid):
    project = get_project(pid)
    in_file = file_upload_validator({"json", "tsv"})
    return_dict=PropertiesFile.create(project, in_file)
    return return_dict, 200


@app.route('/api/qnode/<qid>', methods=['GET'])
@json_response
def get_qnode_info(qid):
    label=get_qnode_label(qid)
    if label is None:
        return {}, 404
    return {"label":label}, 200



@app.route('/api/data/<pid>', methods=['POST'])
@json_response
def upload_data_file(pid):
    """
    This function uploads the data file
    :return:
    """
    project=get_project(pid)
    response = {
                    "tableData": dict(),
                    "wikifierData": dict(),
                    "yamlData": dict(), #this is never not empty
                    "error": None
                }
    new_file=file_upload_validator({'xlsx', 'xls', 'csv'})
    data_file=DataFile.create(project, new_file)
    response["tableData"]=table_data(data_file)
    
    sheet=data_file.current_sheet
    response["wikifierData"]=serialize_item_table(project, sheet)


    y=handle_yaml(sheet, project)
    response["yamlData"]=y

    return response, 200



@app.route('/api/data/<pid>/<sheet_name>', methods=['GET'])
@json_response
def change_sheet(pid, sheet_name):
    """
    This route is used when switching a sheet in an excel data file.
    :return:
    """
    project=get_project(pid)
    response = {
                "tableData": dict(),
                "wikifierData": dict(),
                "yamlData": dict(),
                "error": None
            }
    
    
    data_file=project.current_file
    old_sheet=data_file.current_sheet
    data_file.change_sheet(sheet_name)
    try:
        sheet = data_file.current_sheet
        
        response["tableData"]=table_data(data_file, sheet.name)

        response["wikifierData"]=serialize_item_table(project, sheet)

        y=handle_yaml(sheet, project)
        response["yamlData"]=y

        return response, 200
    except Exception as e: #otherwise we can end up stuck on a corrupted sheet
        data_file.change_sheet(old_sheet)
        raise e



@app.route('/api/wikifier/<pid>', methods=['POST'])
@json_response
def upload_wikifier_output(pid):
    """
    This function uploads the wikifier output
    :return:
    """
    project=get_project(pid)
    response={"error":None}
    in_file = file_upload_validator({"csv"})
    
    wikifier_file = WikifierFile.create(project, in_file)
    if project.current_file:
        sheet=project.current_file.current_sheet
        serialized_item_table = serialize_item_table(project, sheet)
        response.update(serialized_item_table) #does not go into field wikifierData but is dumped directly


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
                raise web_exception.WikifyWithoutDataFileException("Upload data file before wikifying a region")
            sheet=project.current_file.current_sheet

            cell_qnode_map, problem_cells=wikify(region, sheet, context)
            wf= WikifierFile.create_from_dataframe(project, cell_qnode_map)
            
            data = serialize_item_table(project, sheet)

            if problem_cells:
                error_dict={
                    "errorCode": 400,
                    "errorTitle": "Failed to wikify some cellsr",
                    "errorDescription": "Failed to wikify: "+",".join(problem_cells)
                            }
                data['problemCells']=error_dict
            else:
                data['problemCells']=False

    return data, 200




@app.route('/api/yaml/<pid>', methods=['POST'])
@json_response
def upload_yaml(pid):
    """
    This function uploads and processes the yaml file
    :return:
    """
    project=get_project(pid)
    yaml_data = request.form["yaml"]
    response={"error":None,
            "yamlRegions":None}
    if not string_is_valid(yaml_data):
        raise web_exceptions.InvalidYAMLFileException( "YAML file is either empty or not valid")
    else:
        if project.current_file:
            yf=YamlFile.create_from_formdata(project, yaml_data)
            sheet=project.current_file.current_sheet
            sheet.yamlfiles.append(yf)
            project.modify()

            response['yamlRegions']=highlight_region(sheet, yf, project)
        else:
            response['yamlRegions'] = None
            raise web_exception.YAMLEvaluatedWithoutDataFileException("Upload data file before applying YAML.")

    return response, 200


@app.route('/api/data/<pid>/cell/<col>/<row>', methods=['GET'])
@json_response
def get_cell_statement(pid, col, row):
    """
    This function returns the statement of a particular cell
    :return:
    """
    project = get_project(pid)
    data={}

    sheet=project.current_file.current_sheet
    yaml_file = sheet.yaml_file
    if not yaml_file:
        raise web_exception.CellResolutionWithoutYAMLFileException("Upload YAML file before resolving cell.")
    data = get_cell(sheet, yaml_file, project, col, row)
    return data, 200


@app.route('/api/project/<pid>/download/<filetype>', methods=['GET'])
@json_response
def downloader(pid, filetype):
    """
    This functions initiates the download
    :return:
    """
    project = get_project(pid)
    sheet=project.current_file.current_sheet
    yaml_file = sheet.yaml_file
    if not yaml_file: #the frontend disables this, this is just another layer of checking
        raise web_exception.CellResolutionWithoutYAMLFileException("Cannot download report without uploading YAML file first")
    response = download(sheet, yaml_file, project, filetype, project.name)
    return response, 200




@app.route('/api/project/<pid>', methods=['DELETE'])
@json_response
def delete_project(pid):
    """
    This route is used to delete a project.
    :return:
    """
    data={
        'projects':None,
        'error':None
    }
    
    project=get_project(pid)
    Project.delete(project.id)
    data['projects']=get_project_details()
    return data, 200

@app.route('/api/project/<pid>', methods=['PUT'])
@json_response
def rename_project(pid):
    """
    This route is used to rename a project.
    :return:
    """
    data={
        'projects':None,
        'error':None
    }
    ptitle = request.form["ptitle"]
    project=get_project(pid)
    project.title=ptitle
    project.modify()
    data['projects']=get_project_details()
    return data, 200
        
@app.route('/api/project/<pid>/sparql', methods=['PUT'])
@json_response
def update_settings(pid):
    """
    This function updates the settings from GUI
    :return:
    """
    project = get_project(pid)
    endpoint = request.form["endpoint"]
    project.sparql_endpoint=endpoint
    project.modify()
    update_t2wml_settings(project)
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
            from werkzeug.middleware.profiler import ProfilerMiddleware
            from app_config import UPLOAD_FOLDER
            app.config['PROFILE'] = True
            profiles_dir=os.path.join(UPLOAD_FOLDER, "profiles")
            if not os.path.isdir(profiles_dir):
                os.mkdir(profiles_dir)
            app.wsgi_app = ProfilerMiddleware(app.wsgi_app,restrictions = [100], profile_dir=profiles_dir)
        app.run(debug = True, port=13000)
    else:
        app.run(threaded=True, port=13000)
