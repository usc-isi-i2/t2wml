import json
import os
import sys
from pathlib import Path
from flask import request
import web_exceptions
from app_config import app
from t2wml_web import (download, get_layers, get_annotations, get_table, save_annotations,
                        get_project_instance, create_api_project, add_entities_from_project,
                        add_entities_from_file, get_qnodes_layer, update_t2wml_settings, wikify)
from utils import (file_upload_validator, save_dataframe, get_yaml_content, save_yaml)
from web_exceptions import WebException, make_frontend_err_dict
from calc_params import CalcParams
from datamart_upload import upload_to_datamart
from t2wml_annotation_integration import AnnotationIntegration, create_datafile
from global_settings import global_settings
import path_utils

debug_mode = False



def run_annotation(project, calc_params):
    is_csv=Path(calc_params.data_path).suffix == ".csv"
    sheet = calc_params.sheet_name
    ai = AnnotationIntegration(is_csv, calc_params)
    if ai.is_annotated_spreadsheet(project.directory):
        yaml_path = ai.automate_integration(project, calc_params.data_path, sheet)
        return yaml_path

    else:  # not annotation file, check if annotation is available
        annotation_found, new_df = ai.is_annotation_available(project.directory)
        if annotation_found and new_df is not None:
            create_datafile(project, new_df, calc_params.data_path,
                            calc_params.sheet_name)
            calc_params = get_calc_params(project)
            sheet = calc_params.sheet_name
            ai = AnnotationIntegration(is_csv, calc_params,
                                        df=new_df)

            # do not check if dataset exists or not in case we are adding annotation for users, it will only confuse
            # TODO the users. There has to be a better way to handle it. For Future implementation
            yaml_path=ai.automate_integration(project, calc_params.data_path, sheet)
            return yaml_path
    return None



def get_project_folder():
    try:
        project_folder = request.args['project_folder']
        return project_folder
    except KeyError:
        raise web_exceptions.InvalidRequestException("project folder parameter not specified")

def get_project():
    project_folder=get_project_folder()
    project=get_project_instance(project_folder)
    return project

def get_project_dict(project):
    return_dict={}
    return_dict.update(project.__dict__)
    return_dict.update(global_settings.__dict__)
    return return_dict

def json_response(func):
    def wrapper(*args, **kwargs):
        try:
            data, return_code = func(*args, **kwargs)
            return data, return_code
        except WebException as e:
            data = {"error": e.error_dict}
            return data, e.code
        except Exception as e:
            data = {"error": make_frontend_err_dict(e)}
            try:
                code=e.code
                data["error"]["errorCode"]=code
            except AttributeError:
                code=500
            return data, code

    wrapper.__name__ = func.__name__  # This is required to avoid issues with flask
    return wrapper

def update_calc_params_mapping_files(project, calc_params, mapping_file, mapping_type):
    if mapping_type=="Annotation":
        calc_params.annotation_path=Path(project.directory) / mapping_file
    if mapping_type=="Yaml":
        calc_params.yaml_path=Path(project.directory) / mapping_file

def get_calc_params(project, data_required=True, mapping_type=None, mapping_file=None):
    try:
        try:
            data_file = request.args['data_file']
            data_file = data_file
        except KeyError:
            raise web_exceptions.InvalidRequestException("data file parameter not specified")

        try:
            sheet_name = request.args['sheet_name']
        except KeyError:
            raise web_exceptions.InvalidRequestException("sheet name parameter not specified")
    except web_exceptions.InvalidRequestException as e:
        if data_required:
            raise e
        else:
            return None

    add_entities_from_project(project)
    calc_params = CalcParams(project, data_file, sheet_name)

    mapping_type=mapping_type or request.args.get("mapping_type")
    mapping_file=mapping_file or request.args.get("mapping_file")
    update_calc_params_mapping_files(project, calc_params, mapping_file, mapping_type)

    return calc_params

@app.route('/api/project', methods=['GET'])
@json_response
def get_project_files():
    project=get_project()
    response=dict(project=get_project_dict(project))
    return response, 200



@app.route('/api/mapping', methods=['GET'])
@json_response
def get_mapping(mapping_file=None, mapping_type=None):
    project=get_project()
    calc_params=get_calc_params(project)
    #if redirecting from a save:
    update_calc_params_mapping_files(project, calc_params, mapping_file, mapping_type)

    response=dict(project=get_project_dict(project))

    if calc_params.annotation_path:
        response["annotations"], response["yamlContent"]=get_annotations(calc_params)
    elif calc_params.yaml_path:
        response["yamlContent"]=get_yaml_content(calc_params)
        response["annotations"]=[]
    get_layers(response, calc_params)

    return response, 200

@app.route('/api/table', methods=['GET'])
@json_response
def get_data():
    project=get_project()
    calc_params=get_calc_params(project)
    response=dict()
    response["table"] = get_table(calc_params)
    calc_response, code = get_mapping()
    response.update(calc_response)
    return response, 200





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
    project=create_api_project(project_folder)
    response = dict(project=get_project_dict(project))
    return response, 201


@app.route('/api/data', methods=['POST'])
@json_response
def upload_data_file():
    """
    This function uploads the data file.
    If datamart_integration is True, it will attempt to run that on the file
    :return:
    """
    project=get_project()

    file_path = file_upload_validator({'.xlsx', '.xls', '.csv'})
    data_file = project.add_data_file(file_path, copy_from_elsewhere=True, overwrite=True)
    project.save()
    response=dict(project=get_project_dict(project))
    sheet_name=project.data_files[data_file]["val_arr"][0]

    annotations_dir=os.path.join(project.directory, "annotations")
    if not os.path.isdir(annotations_dir):
        os.mkdir(annotations_dir)
    annotations_path=os.path.join(annotations_dir, Path(data_file).stem+"_"+sheet_name+".json")


    save_annotations(project, [], os.path.join(annotations_path), data_file, sheet_name)
    calc_params=CalcParams(project, data_file, sheet_name, None)

    if global_settings.datamart_integration:
        calc_params.yaml_path=run_annotation(project, calc_params)
        response["yamlContent"]=get_yaml_content(calc_params)
    response["table"] = get_table(calc_params)
    get_layers(response, calc_params)


    return response, 200


@app.route('/api/project/entity', methods=['POST'])
@json_response
def upload_entities():
    project=get_project()

    file_path = file_upload_validator({".tsv"})
    project.add_entity_file(file_path, copy_from_elsewhere=True, overwrite=True)
    project.save()

    entities_stats = add_entities_from_file(file_path)
    response = dict(entitiesStats= entities_stats, project=get_project_dict(project))
    calc_params = get_calc_params(project, data_required=False)
    if calc_params:
        response["layers"] = get_qnodes_layer(calc_params)
    return response, 200

@app.route('/api/wikifier', methods=['POST'])
@json_response
def upload_wikifier_output():
    """
    This function uploads the wikifier output
    :return:
    """
    project=get_project()

    file_path = file_upload_validator({".csv"})
    file_path = project.add_wikifier_file(file_path, copy_from_elsewhere=True, overwrite=True)
    project.save()

    response=dict(project=get_project_dict(project))
    calc_params = get_calc_params(project, data_required=False)
    if calc_params:
        response["layers"]=get_qnodes_layer(calc_params)
    return response, 200


@app.route('/api/wikifier_service', methods=['POST'])
@json_response
def call_wikifier_service():
    """
    This function calls the wikifier service to wikifiy a region, and deletes/updates wiki region file's results
    :return:
    """
    project=get_project()
    region = request.get_json()["region"]
    context = request.get_json()["context"]
    calc_params = get_calc_params(project)


    cell_qnode_map, problem_cells = wikify(calc_params, region, context)
    file_path = save_dataframe(project, cell_qnode_map, "wikify_region_output.csv")
    file_path = project.add_wikifier_file(file_path,  copy_from_elsewhere=True, overwrite=True)
    project.save()

    calc_params = get_calc_params(project)
    response=dict(project=get_project_dict(project))
    response["layers"]=get_qnodes_layer(calc_params)

    if problem_cells:
        response['wikifierError'] =  "Failed to wikify: " + ",".join(problem_cells)

    return response, 200

@app.route('/api/yaml/rename', methods=['POST'])
@json_response
def rename_yaml():
    project=get_project()

    old_name = request.get_json()["old_name"]
    new_name = request.get_json()["new_name"]

    if old_name not in project.yaml_files:
        raise web_exceptions.MissingYAMLFileException(
            "The yaml file you are trying to rename does not exist in project")
    if new_name in project.yaml_files:
        raise web_exceptions.MissingYAMLFileException(
            "The new name you have provided already exists in the project as a yaml file")

    old_path=os.path.join(project.directory, old_name)
    new_path=os.path.join(project.directory, new_name)

    os.rename(old_path, new_path)

    old_name_index=project.yaml_files.index(old_name)
    project.yaml_files[old_name_index]=new_name
    for sheet_name, sheet_arr in project.yaml_sheet_associations.items():
        if old_name in sheet_arr:
            old_name_index=sheet_arr.index(old_name)
            sheet_arr[old_name_index]=new_name
    project.save()

    response=dict(project=get_project_dict(project))
    return response, 200



@app.route('/api/yaml/save', methods=['POST'])
@json_response
def upload_yaml():
    project=get_project()
    calc_params = get_calc_params(project)
    sheet_name=calc_params.sheet_name
    yaml_data = request.get_json()["yaml"]
    yaml_title = request.get_json()["title"]
    save_yaml(project, yaml_data, calc_params.data_path, sheet_name, yaml_title)
    response=dict(project=get_project_dict(project))
    return response, 200

@app.route('/api/yaml/apply', methods=['POST'])
@json_response
def apply_yaml():
    """
    This function uploads and processes the yaml file
    :return:
    """
    project=get_project()

    upload_yaml()
    yaml_title = request.get_json()["title"]
    yaml_path = Path(project.directory) / yaml_title
    response=dict(project=get_project_dict(project))
    calc_response, code = get_mapping(yaml_path, "Yaml")
    response.update(calc_response)
    return response, code



@app.route('/api/project/download/<filetype>', methods=['GET'])
@json_response
def download_results(filetype):
    """
    This functions initiates the download
    :return:
    """
    project=get_project()
    calc_params = get_calc_params(project)
    if not calc_params.yaml_path:  # the frontend disables this, this is just another layer of checking
        raise web_exceptions.CellResolutionWithoutYAMLFileException(
            "Cannot download report without uploading YAML file first")
    response = download(calc_params, filetype)
    return response, 200


@app.route('/api/project/datamart', methods=['GET'])
@json_response
def load_to_datamart():
    project=get_project()
    calc_params = get_calc_params(project)
    try:
        sheet = calc_params.sheet_name
    except:
        raise web_exceptions.YAMLEvaluatedWithoutDataFileException(
            "Can't upload to datamart without datafile and sheet")
    data = upload_to_datamart(calc_params)
    return data, 201


@app.route('/api/annotation', methods=['POST'])
@json_response
def upload_annotation():
    project=get_project()
    calc_params=get_calc_params(project)
    #TODO: will be replaced with proper fetching of annotation name and being able to switch between annotations
    annotations_dir=os.path.join(project.directory, "annotations")
    if not os.path.isdir(annotations_dir):
        os.mkdir(annotations_dir)
    annotations_path=os.path.join(annotations_dir, Path(calc_params.data_path).stem+"_"+calc_params.sheet_name+".json")
    annotation = request.get_json()["annotations"]


    save_annotations(project, annotation, annotations_path, calc_params.data_path, calc_params.sheet_name)
    response = dict(project= get_project_dict(project))
    calc_response, code = get_mapping(annotations_path, "Annotation")
    response.update(calc_response)
    return response, code

@app.route('/api/project', methods=['PUT'])
@json_response
def rename_project():
    """
    This route is used to rename a project.
    :return:
    """
    ptitle = request.get_json()["ptitle"]
    project=get_project()
    project.title = ptitle
    project.save()
    response = dict(project= get_project_dict(project))
    return response, 200


@app.route('/api/project/settings', methods=['PUT', 'GET'])
@json_response
def update_settings():
    """
    This function updates the settings from GUI
    :return:
    """
    project=get_project()

    if request.method == 'PUT':
        endpoint = request.get_json().get("endpoint", None)
        if endpoint:
            project.sparql_endpoint = endpoint
        warn = request.get_json().get("warnEmpty", None)
        if warn is not None:
            project.warn_for_empty_cells = warn
        calendar=request.get_json().get("handleCalendar", None)
        if calendar:
            project.handle_calendar=calendar
        project.save()
        update_t2wml_settings(project)

        new_global_settings=dict()
        datamart = request.get_json().get("datamartIntegration", None)
        if datamart is not None:
            new_global_settings["datamart_integration"] = datamart
        datamart_api = request.get_json().get("datamartApi", None)
        if datamart_api is not None:
            new_global_settings["datamart_api"] = datamart_api
        global_settings.update(**new_global_settings)

    response=dict(project = get_project_dict(project))
    return response, 200


@app.route('/api/is-alive')
def is_alive():
    return 'Backend is here', 200

@app.route('/api/windows/add-to-path', methods=['POST'])
def windows_add_to_path():
    if sys.platform != 'win32':
        raise web_exceptions.InvalidRequestException("path can only be set on Windows")

    path = request.args.get('path')
    if not path:
        raise web_exceptions.InvalidRequestException("path parameter not specified")

    path_utils.windows_add_to_path(path)
    return {}, 201



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
            from app_config import DATADIR

            app.config['PROFILE'] = True
            profiles_dir = os.path.join(DATADIR, "profiles")
            if not os.path.isdir(profiles_dir):
                os.mkdir(profiles_dir)
            app.wsgi_app = ProfilerMiddleware(app.wsgi_app,
            restrictions=[100],
            profile_dir=profiles_dir)
        app.run(debug=True, port=13000)
    else:
        app.run(threaded=True, port=13000)
