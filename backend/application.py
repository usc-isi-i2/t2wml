import json
import os
import sys
from pathlib import Path
import shutil
from flask import request

from t2wml.utils.t2wml_exceptions import T2WMLException
from t2wml.api import Project as apiProject
from t2wml.api import add_entities_from_file
import web_exceptions
from app_config import app
from t2wml_web import (download, get_cell, handle_yaml, serialize_item_table,
                       highlight_region, update_t2wml_settings, wikify)
from utils import (file_upload_validator, save_file, save_dataframe,
                   make_frontend_err_dict, string_is_valid, table_data, save_yaml)
from web_exceptions import WebException
from calc_params import CalcParams
from datamart_upload import upload_to_datamart
from t2wml_annotation_integration import AnnotationIntegration, create_datafile

annotation_integration = False
try:
    from local_settings import *
except:
    pass

debug_mode = False


def get_project(project_folder):
    project = apiProject.load(project_folder)
    update_t2wml_settings(project)
    return project


def get_calc_params(project):
    if not project.current_data_file:
        return None
    data_file = Path(project.directory) / project.current_data_file
    sheet_name = project.current_sheet
    if project.current_yaml:
        yaml_file = Path(project.directory) / project.current_yaml
    else:
        yaml_file = None
    if project.current_wikifiers:
        wikifier_files = [Path(project.directory) / wf for wf in project.current_wikifiers]
    else:
        wikifier_files = None
    calc_params = CalcParams(project.directory, data_file, sheet_name, yaml_file, wikifier_files)
    return calc_params


def get_project_folder():
    try:
        project_folder = request.args['project_folder']
        return project_folder
    except KeyError:
        raise web_exceptions.InvalidRequestException("project folder parameter not specified")


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


@app.route('/api/project', methods=['POST'])
@json_response
def create_project():
    """
    This route creates a project
    :return:
    """

    project_folder = get_project_folder()
    # check we're not overwriting existing project
    project_file = Path(project_folder) / "project.t2wml"
    if project_file.is_file():
        raise web_exceptions.ProjectAlreadyExistsException(project_folder)
    # create project
    api_proj = apiProject(project_folder)
    api_proj.title = Path(project_folder).stem
    api_proj.save()

    response = dict(project=api_proj.__dict__)
    return response, 201


@app.route('/api/project/load', methods=['POST'])
@json_response
def load_project():
    """
    This route loads an existing project
    :return:
    """
    project_folder = get_project_folder()
    project = apiProject.load(project_folder)
    for f in project.entity_files:
        response = add_entities_from_file(Path(project.directory) / f)
    update_t2wml_settings(project)
    response = dict(project=project.__dict__)
    return response, 201


@app.route('/api/project', methods=['GET'])
@json_response
def get_project_files():
    """
    This function fetches the last session of the last opened files in a project when that project is reopened later.
    :return:
    """
    project_folder = get_project_folder()
    project = get_project(project_folder)

    for f in project.entity_files:
        add_entities_from_file(Path(project.directory) / f)
    response = {
        "tableData": None,
        "yamlData": None,
        "wikifierData": None,
    }

    response["name"] = project.title

    calc_params = get_calc_params(project)
    if calc_params:
        response["tableData"] = table_data(calc_params)
        response["wikifierData"] = serialize_item_table(calc_params)
        response["yamlData"] = handle_yaml(calc_params)
    response['project'] = project.__dict__
    return response, 200


@app.route('/api/project/entity', methods=['POST'])
@json_response
def add_entity_definitions():
    project_folder = get_project_folder()
    project = get_project(project_folder)

    in_file = file_upload_validator({"tsv"})
    file_path = save_file(project_folder, in_file)
    project.add_entity_file(file_path, copy_from_elsewhere=True, overwrite=True)
    project.save()

    return_dict = add_entities_from_file(file_path)
    response = {"widget": return_dict}
    calc_params = get_calc_params(project)
    if calc_params:
        serialized_item_table = serialize_item_table(calc_params)
        response.update(serialized_item_table)
    response['project'] = project.__dict__
    return response, 200


@app.route('/api/data', methods=['POST'])
@json_response
def upload_data_file():
    """
    This function uploads the data file
    :return:
    """
    project_folder = get_project_folder()
    project = get_project(project_folder)
    response = {
        "tableData": dict(),
        "wikifierData": dict(),
        "yamlData": dict(),  # this is never not empty
        "error": None
    }
    in_file = file_upload_validator({'xlsx', 'xls', 'csv'})
    file_path = save_file(project_folder, in_file)
    project.add_data_file(file_path)  # , copy_from_elsewhere=True, overwrite=True)
    project.update_saved_state(current_data_file=file_path)
    project.save()

    calc_params = get_calc_params(project)

    calc_params = get_calc_params(project)
    response["tableData"] = table_data(calc_params)
    sheet = project.current_sheet

    # If this is an annotated spreadsheet, we can populate the wikifier, properties, yaml
    # and item definitions automatically
    if annotation_integration:
        ai = AnnotationIntegration(response['tableData']['isCSV'], response['tableData']['currSheetName'],
                                   w_requests=request)
        if ai.is_annotated_spreadsheet(project.directory):
            dataset_exists = ai.automate_integration(project, response, sheet)
            if not dataset_exists:
                # report to user
                error_dict = {
                    "errorCode": 404,
                    "errorTitle": "Datamart Integration Error",
                    "errorDescription": f"Dataset: \"{ai.dataset}\" does not exist. To create this dataset, "
                                        f"please provide dataset name in cell C1 \n"
                                        f"dataset description in cell D1 \n"
                                        f"and url in cell E1\n\n"
                }
                response['error'] = error_dict
                return response, 404
        else:  # not annotation file, check if annotation is available
            annotation_found, new_df = ai.is_annotation_available(project.directory)
            if annotation_found and new_df is not None:
                create_datafile(project, new_df, response['tableData']['filename'],
                                response['tableData']['currSheetName'])
                calc_params = get_calc_params(project)
                response["tableData"] = table_data(calc_params)
                sheet = project.current_sheet
                ai = AnnotationIntegration(response['tableData']['isCSV'], response['tableData']['currSheetName'],
                                           df=new_df)

                # do not check if dataset exists or not in case we are adding annotation for users, it will only confuse
                # TODO the users. There has to be a better way to handle it. For Future implementation
                ai.automate_integration(project, response, sheet)

        calc_params = get_calc_params(project)
    response["wikifierData"] = serialize_item_table(calc_params)
    response["yamlData"] = handle_yaml(calc_params)
    response['project'] = project.__dict__
    return response, 200


@app.route('/api/data/<sheet_name>', methods=['GET'])
@json_response
def change_sheet(sheet_name):
    """
    This route is used when switching a sheet in an excel data file.
    :return:
    """
    project_folder = get_project_folder()
    project = get_project(project_folder)
    response = {
        "tableData": dict(),
        "wikifierData": dict(),
        "yamlData": dict(),
        "error": None
    }

    project.update_saved_state(current_sheet=sheet_name)
    project.save()

    calc_params = get_calc_params(project)
    if calc_params:
        response["tableData"] = table_data(calc_params)
        response["wikifierData"] = serialize_item_table(calc_params)
        response["yamlData"] = handle_yaml(calc_params)

    return response, 200


@app.route('/api/wikifier', methods=['POST'])
@json_response
def upload_wikifier_output():
    """
    This function uploads the wikifier output
    :return:
    """
    project_folder = get_project_folder()
    project = get_project(project_folder)
    response = {"error": None}
    in_file = file_upload_validator({"csv"})

    file_path = save_file(project_folder, in_file)
    project.add_wikifier_file(file_path, copy_from_elsewhere=True, overwrite=True)
    project.update_saved_state(current_wikifiers=[file_path])
    project.save()

    calc_params = get_calc_params(project)
    if calc_params:
        serialized_item_table = serialize_item_table(calc_params)
        # does not go into field wikifierData but is dumped directly
        response.update(serialized_item_table)
    response['project'] = project.__dict__
    return response, 200


@app.route('/api/wikifier_service', methods=['POST'])
@json_response
def wikify_region():
    """
    This function calls the wikifier service to wikifiy a region, and deletes/updates wiki region file's results
    :return:
    """
    project_folder = get_project_folder()
    project = get_project(project_folder)
    action = request.form["action"]
    region = request.form["region"]
    context = request.form["context"]
    flag = int(request.form["flag"])
    if action == "wikify_region":
        if not project.current_data_file:
            raise web_exceptions.WikifyWithoutDataFileException(
                "Upload data file before wikifying a region")
        calc_params = get_calc_params(project)

        cell_qnode_map, problem_cells = wikify(calc_params, region, context)
        file_path = save_dataframe(project, cell_qnode_map, "wikify_region_output.csv")
        project.add_wikifier_file(file_path)  # , copy_from_elsewhere=True, overwrite=True)
        project.update_saved_state(current_wikifiers=[file_path])
        project.save()

        calc_params = get_calc_params(project)
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
        data['project'] = project.__dict__
        return data, 200
    return {}, 404


@app.route('/api/yaml', methods=['POST'])
@json_response
def upload_yaml():
    """
    This function uploads and processes the yaml file
    :return:
    """
    project_folder = get_project_folder()
    project = get_project(project_folder)
    yaml_data = request.form["yaml"]
    yaml_title = request.form["title"]
    response = {"error": None,
                "yamlRegions": None}
    if not string_is_valid(yaml_data):
        raise web_exceptions.InvalidYAMLFileException(
            "YAML file is either empty or not valid")
    if not project.current_data_file:
        raise web_exceptions.YAMLEvaluatedWithoutDataFileException(
            "Upload data file before applying YAML.")
    save_yaml(project, yaml_data, yaml_title)
    calc_params = get_calc_params(project)
    response['yamlRegions'] = highlight_region(calc_params)
    response['project'] = project.__dict__
    return response, 200


@app.route('/api/data//cell/<col>/<row>', methods=['GET'])
@json_response
def get_cell_statement(col, row):
    """
    This function returns the statement of a particular cell
    :return:
    """
    project_folder = get_project_folder()
    project = get_project(project_folder)
    data = {}

    calc_params = get_calc_params(project)
    if not calc_params.yaml_path:
        raise web_exceptions.CellResolutionWithoutYAMLFileException(
            "Upload YAML file before resolving cell.")
    data = get_cell(calc_params, col, row)
    return data, 200


@app.route('/api/project/download/<filetype>', methods=['GET'])
@json_response
def downloader(filetype):
    """
    This functions initiates the download
    :return:
    """
    project_folder = get_project_folder()
    project = get_project(project_folder)
    calc_params = get_calc_params(project)
    if not calc_params.yaml_path:  # the frontend disables this, this is just another layer of checking
        raise web_exceptions.CellResolutionWithoutYAMLFileException(
            "Cannot download report without uploading YAML file first")
    response = download(calc_params, filetype)
    return response, 200


@app.route('/api/project/datamart', methods=['GET'])
@json_response
def load_to_datamart():
    project_folder = get_project_folder()
    project = get_project(project_folder)
    calc_params = get_calc_params(project)
    try:
        sheet = project.current_sheet
    except:
        raise web_exceptions.YAMLEvaluatedWithoutDataFileException(
            "Can't upload to datamart without datafile and sheet")
    data = upload_to_datamart(calc_params)
    return data, 201


@app.route('/api/project', methods=['PUT'])
@json_response
def rename_project():
    """
    This route is used to rename a project.
    :return:
    """
    ptitle = request.form["ptitle"]
    project_folder = get_project_folder()
    project = get_project(project_folder)
    project.title = ptitle
    project.save()
    response = dict(error=None)
    response['project'] = project.__dict__
    return response, 200


@app.route('/api/project/settings', methods=['PUT', 'GET'])
@json_response
def update_settings():
    """
    This function updates the settings from GUI
    :return:
    """
    project_folder = get_project_folder()
    project = get_project(project_folder)

    endpoint = request.form.get("endpoint", None)
    if endpoint:
        project.sparql_endpoint = endpoint
    warn = request.form.get("warnEmpty", None)
    if warn is not None:
        project.warn_for_empty_cells = warn.lower() == 'true'
    project.save()
    update_t2wml_settings(project)
    response = {
        "endpoint": project.sparql_endpoint,
        "warnEmpty": project.warn_for_empty_cells
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
