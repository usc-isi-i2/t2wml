import pandas as pd
import os
import sys
import requests
from pathlib import Path
from flask import request
import web_exceptions
from app_config import app
from werkzeug.utils import secure_filename
from t2wml.input_processing.annotation_suggesting import annotation_suggester
from t2wml_web import (get_kgtk_download_and_variables, set_web_settings, download, get_layers, get_annotations, get_table, save_annotations,
                       get_project_instance, create_api_project, add_entities_from_project, get_partial_csv,
                       add_entities_from_file, get_qnodes_layer, get_entities, suggest_annotations, update_entities, update_t2wml_settings, wikify, get_entities)
from utils import (file_upload_validator, get_empty_layers, save_dataframe,
                   get_yaml_content, save_yaml)
from web_exceptions import WebException, make_frontend_err_dict
from calc_params import CalcParams
from global_settings import global_settings
import path_utils
from wikification import wikify_countries

debug_mode = False

set_web_settings()



def get_project_folder():
    try:
        project_folder = request.args['project_folder']
        return project_folder
    except KeyError:
        raise web_exceptions.InvalidRequestException(
            "project folder parameter not specified")


def get_project():
    project_folder = get_project_folder()
    project = get_project_instance(project_folder)
    return project


def get_project_dict(project):
    return_dict = {}
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
            print(e)
            if "Permission denied" in str(e):
                e=web_exceptions.FileOpenElsewhereError("Check whether a file you are trying to edit is open elsewhere on your computer: "+str(e))
                data = {"error": e.error_dict}
                return data, 403

            data = {"error": make_frontend_err_dict(e)}
            try:
                code = e.code
                data["error"]["errorCode"] = code
            except AttributeError:
                code = 500
            return data, code

    wrapper.__name__ = func.__name__  # This is required to avoid issues with flask
    return wrapper


def update_calc_params_mapping_files(project, calc_params, mapping_file, mapping_type):
    if mapping_type == "Annotation":
        calc_params.annotation_path = Path(project.directory) / mapping_file
    if mapping_type == "Yaml":
        calc_params.yaml_path = Path(project.directory) / mapping_file


def get_calc_params(project, data_required=True, mapping_type=None, mapping_file=None):
    try:
        try:
            data_file = request.args['data_file']
            data_file = data_file
        except KeyError:
            raise web_exceptions.InvalidRequestException(
                "data file parameter not specified")

        try:
            sheet_name = request.args['sheet_name']
        except KeyError:
            raise web_exceptions.InvalidRequestException(
                "sheet name parameter not specified")
    except web_exceptions.InvalidRequestException as e:
        if data_required:
            raise e
        else:
            return None

    add_entities_from_project(project)
    calc_params = CalcParams(project, data_file, sheet_name)

    mapping_type = mapping_type or request.args.get("mapping_type")
    mapping_file = mapping_file or request.args.get("mapping_file")
    update_calc_params_mapping_files(
        project, calc_params, mapping_file, mapping_type)

    return calc_params


@app.route('/api/project', methods=['GET'])
@json_response
def get_project_files():
    project = get_project()
    response = dict(project=get_project_dict(project))
    return response, 200


@app.route('/api/mapping', methods=['GET'])
@json_response
def get_mapping(mapping_file=None, mapping_type=None):
    project = get_project()
    calc_params = get_calc_params(project)
    # if redirecting from a save:
    update_calc_params_mapping_files(
        project, calc_params, mapping_file, mapping_type)

    response = dict(project=get_project_dict(project))

    if calc_params.yaml_path:
        response["yamlContent"] = get_yaml_content(calc_params)
        response["annotations"] = []
    else:
        response["annotations"], response["yamlContent"] = get_annotations(
            calc_params)
    get_layers(response, calc_params)
    return response, 200


@app.route('/api/table', methods=['GET'])
@json_response
def get_data():
    project = get_project()
    data_file = request.args.get('data_file')
    if not data_file:
        response=dict(layers=get_empty_layers(), table=[[]])
        return response, 200
    calc_params = get_calc_params(project)
    response = dict()
    response["table"] = get_table(calc_params)
    calc_response, code = get_mapping()
    response.update(calc_response)
    return response, code

@app.route('/api/partialcsv', methods=['GET'])
@json_response
def partial_csv():
    project = get_project()
    calc_params = get_calc_params(project)
    response=dict()
    try:
        response["partialCsv"]=get_partial_csv(calc_params)
    except Exception as e:
        print(e)
        response["partialCsv"]=dict(dims=[1,3],
                                    firstRowIndex=0,
                                    cells=[["subject", "property", "value"]])
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
    title = request.get_json()["title"]
    if not title:
        raise web_exceptions.InvalidRequestException(
            "title required to create project")
    description = request.get_json().get("description", "")
    url = request.get_json().get("url", "")
    # create project
    project = create_api_project(project_folder, title, description, url)
    response = dict(project=get_project_dict(project))
    return response, 201


@app.route('/api/data', methods=['POST'])
@json_response
def upload_data_file():
    """
    This function uploads the data file.
    :return:
    """
    project = get_project()

    file_path = file_upload_validator({'.xlsx', '.xls', '.csv', '.tsv'})
    data_file = project.add_data_file(file_path, copy_from_elsewhere=True, overwrite=True)
    project.save()
    response = dict(project=get_project_dict(project))
    sheet_name = project.data_files[data_file]["val_arr"][0]

    annotations_dir = os.path.join(project.directory, "annotations")
    if not os.path.isdir(annotations_dir):
        os.mkdir(annotations_dir)
    annotations_path = os.path.join(annotations_dir, Path(
        data_file).stem+"_"+sheet_name+".annotation")

    save_annotations(project, [], os.path.join(
        annotations_path), data_file, sheet_name)

    calc_params = CalcParams(project, data_file, sheet_name, None)
    response["table"] = get_table(calc_params)
    get_layers(response, calc_params)

    return response, 200


@app.route('/api/project/entities', methods=['POST'])
@json_response
def upload_entities():
    project = get_project()

    file_path = file_upload_validator({".tsv"})
    project.add_entity_file(
        file_path, copy_from_elsewhere=True, overwrite=True)
    project.save()

    entities_stats = add_entities_from_file(file_path)
    response = dict(entitiesStats=entities_stats,
                    project=get_project_dict(project))
    calc_params = get_calc_params(project, data_required=False)
    if calc_params:
        response["layers"] = get_qnodes_layer(calc_params)
    return response, 200


@app.route('/api/project/entities', methods=['GET'])
@json_response
def get_project_entities():
    project = get_project()
    response = get_entities(project)
    return response, 200


@app.route('/api/project/entities', methods=['PUT'])
@json_response
def edit_entities():
    project = get_project()
    entity_file = request.get_json()["entity_file"]
    updated_entries = request.get_json()["updated_entries"]
    response = update_entities(project, entity_file, updated_entries)
    return response, 200


@app.route('/api/wikifier', methods=['POST'])
@json_response
def upload_wikifier_output():
    """
    This function uploads the wikifier output
    :return:
    """
    project = get_project()

    file_path = file_upload_validator({".csv"})
    file_path = project.add_wikifier_file(
        file_path, copy_from_elsewhere=True, overwrite=True)
    project.save()

    response = dict(project=get_project_dict(project))
    calc_params = get_calc_params(project, data_required=False)
    if calc_params:
        response["layers"] = get_qnodes_layer(calc_params)
    return response, 200


@app.route('/api/wikifier_service', methods=['POST'])
@json_response
def call_wikifier_service():
    """
    This function calls the wikifier service to wikifiy a region, and deletes/updates wiki region file's results
    :return:
    """
    project = get_project()
    region = request.get_json()["region"]
    context = request.get_json()["context"]
    calc_params = get_calc_params(project)

    cell_qnode_map, problem_cells = wikify(calc_params, region, context)
    file_path = save_dataframe(
        project, cell_qnode_map, "wikify_region_output.csv")
    file_path = project.add_wikifier_file(
        file_path,  copy_from_elsewhere=True, overwrite=True)
    project.save()

    calc_params = get_calc_params(project)
    response = dict(project=get_project_dict(project))
    response["layers"] = get_qnodes_layer(calc_params)

    if problem_cells:
        response['wikifierError'] = "Failed to wikify: " + \
            ",".join(problem_cells)

    return response, 200


@app.route('/api/yaml/save', methods=['POST'])
@json_response
def upload_yaml():
    project = get_project()
    dataFile = request.get_json()["dataFile"]
    sheet_name = request.get_json()["sheetName"]
    yaml_data = request.get_json()["yaml"]
    title = request.get_json()["title"]
    filename = save_yaml(project, yaml_data, dataFile, sheet_name, title)
    response = dict(project=get_project_dict(project), filename=filename)
    return response, 200


@app.route('/api/yaml/apply', methods=['POST'])
@json_response
def apply_yaml():
    """
    This function uploads and processes the yaml file
    :return:
    """
    project = get_project()
    calc_params = get_calc_params(project)
    yaml_data = request.get_json()["yaml"]
    title = request.get_json()["title"]
    save_yaml(project, yaml_data, calc_params.data_path,
              calc_params.sheet_name, title)
    yaml_title = request.get_json()["title"]
    yaml_path = Path(project.directory) / yaml_title
    response = dict(project=get_project_dict(project))
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
    project = get_project()
    calc_params = get_calc_params(project)
    # the frontend disables this, this is just another layer of checking
    if not calc_params.yaml_path and not calc_params.annotation_path:
        raise web_exceptions.CellResolutionWithoutYAMLFileException(
            "Cannot download report without uploading mapping file first")
    if filetype == "csv":
        from t2wml_web import get_kg
        from t2wml.settings import t2wml_settings
        t2wml_settings.no_wikification = True
        kg = get_kg(calc_params)
        response = dict()
        response["data"] = kg.get_output("csv")
        response["error"] = None
        response["internalErrors"] = kg.errors if kg.errors else None
        return response, 200

    response = download(calc_params, filetype)
    return response, 200


@app.route('/api/project/datamart', methods=['GET'])
@json_response
def load_to_datamart():
    project = get_project()
    calc_params = get_calc_params(project)
    download_output, variables = get_kgtk_download_and_variables(calc_params, validate_for_datamart=True)
    files = {"edges.tsv": download_output}
    datamart_api_endpoint = global_settings.datamart_api
    dataset_id = project.dataset_id
    response_from_docker = requests.post(
        f'{datamart_api_endpoint}/datasets/{dataset_id}/t2wml', files=files)
    if response_from_docker.status_code == 204:
        # var_params="?"
        # for variable in variables:
        #     var_params+=f'variable={variable}&'
        # var_params=var_params[:-1]
        data = {'datamart_get_url': f'{datamart_api_endpoint}/datasets/{dataset_id}/variables',
                'variables': list(variables)}
    else:
        data = {'description': response_from_docker.text}

    return data, 201


@app.route('/api/annotation/create', methods=['POST'])
@json_response
def save_annotation():
    project = get_project()
    dataFile = request.get_json()["dataFile"]
    sheet_name = request.get_json()["sheetName"]
    title = request.get_json()["title"]
    annotations_path = Path(project.directory) / title
    filename = save_annotations(
        project, [], annotations_path, dataFile, sheet_name)
    response = dict(project=get_project_dict(project), filename=filename)
    return response, 200


@app.route('/api/annotation', methods=['POST'])
@json_response
def upload_annotation():
    project = get_project()
    calc_params = get_calc_params(project)
    title = request.get_json()["title"]
    annotation = request.get_json()["annotations"]
    annotations_path = Path(project.directory) / title
    save_annotations(project, annotation, annotations_path,
                     calc_params.data_path, calc_params.sheet_name)
    response = dict(project=get_project_dict(project))
    calc_response, code = get_mapping(annotations_path, "Annotation")
    response.update(calc_response)
    return response, code


@app.route('/api/annotation/suggest', methods=['PUT'])
@json_response
def suggest_annotation_block():
    project = get_project()
    calc_params = get_calc_params(project)
    block = request.get_json()["selection"]
    annotation = request.get_json()["annotations"]

    response={ #fallback response
        "roles": ["dependentVar", "mainSubject", "property", "qualifier", "unit"], #drop metadata
        "types": ["string", "quantity", "time", "wikibaseitem"], #drop monolingual string
        "children": {}
    }

    try:
        response = annotation_suggester(calc_params.sheet, block, annotation)
    except Exception as e:
        print(e)
        pass
    return response, 200


@app.route('/api/annotation/guess-blocks', methods=['GET'])
@json_response
def guess_annotation_blocks():
    project = get_project()
    calc_params = get_calc_params(project)
    annotation_blocks=suggest_annotations(calc_params)
    response=dict()
    response["annotations"], response["yamlContent"] = get_annotations(calc_params)
    return response, 200



@app.route('/api/project/globalsettings', methods=['PUT', 'GET'])
@json_response
def update_global_settings():
    if request.method == 'PUT':
        new_global_settings = dict()
        datamart_api = request.get_json().get("datamartApi", None)
        if datamart_api is not None:
            new_global_settings["datamart_api"] = datamart_api
        global_settings.update(**new_global_settings)

    response = global_settings.__dict__
    return response, 200


@app.route('/api/project/settings', methods=['PUT', 'GET'])
@json_response
def update_settings():
    """
    This function updates the settings from GUI
    :return:
    """
    project = get_project()
    if request.method == 'PUT':
        request_json = request.get_json()
        title = request_json.get("title", None)
        if title:
            project.title = title
        description = request_json.get("description", None)
        if description is not None:
            project.description = description
        url = request_json.get("url", None)
        if url is not None:
            project.url = url
        endpoint = request_json.get("endpoint", None)
        if endpoint:
            project.sparql_endpoint = endpoint
        warn = request_json.get("warnEmpty", None)
        if warn is not None:
            project.warn_for_empty_cells = warn
        calendar = request_json.get("handleCalendar", None)
        if calendar:
            calendar_dict = {
                "Replace with Gregorian": "replace",
                "Leave Untouched": "leave",
                "Add Gregorian": "add",
                "replace": "replace",
                "add": "add",
                "leave": "leave"
            }
            try:
                project.handle_calendar = calendar_dict[calendar]
            except KeyError:
                raise web_exceptions.InvalidRequestException(
                    "No such calendar option")
        project.save()
        update_t2wml_settings(project)

    response = dict(project=get_project_dict(project))
    return response, 200

@app.route('/api/properties', methods=['GET'])
@app.route('/api/qnodes', methods=['GET'])
@json_response
def get_qnodes():
    q = request.args.get('q')
    if not q:
        raise web_exceptions.InvalidRequestException("No search parameter set")

    # construct the url with correct parameters for kgtk search
    url = 'https://kgtk.isi.edu/api?q={}'.format(q)

    if "properties" in request.url:
        url += '&type=ngram&extra_info=true&language=en&item=property'
        data_type = request.args.get('data_type')
        if data_type:
            if data_type=="wikibaseitem":
                data_type="wikibase-item"
            url += '&data_type={}'.format(data_type)

    else: #qnodes
        # get the optional parameters for the url
        is_class = request.args.get('is_class')
        url += '&extra_info=true&language=en'
        if is_class:
            url += '&is_class=true&type=exact&size=5'
        else:
            url += '&is_class=false&type=ngram&size=10'
            instance_of = request.args.get('instance_of')
            if instance_of:
                url += '&instance_of={}'.format(instance_of)

    try:
        response = requests.get(url, verify=False)
    except requests.exceptions.RequestException as error:
        raise web_exceptions.InvalidRequestException(error)
    else:
        items = response.json()
        if type(items) != list:
            raise web_exceptions.InvalidRequestException(
                "KGTK did not return a valid list of nodes"
            )
        qnodes = [{
            'id': item['qnode'],
            'label': item['label'][0] if item['label'] else '',
            'description': item['description'][0] if item['description'] else '',
        } for item in items]

    return {'qnodes': qnodes}, 200


@app.route('/api/set_qnode', methods=['POST'])
@json_response
def set_qnode():
    project = get_project()
    calc_params = get_calc_params(project)
    sheet_name = calc_params.sheet.name
    data_file_name = calc_params.sheet.data_file_name
    qnode_dict = request.get_json()['qnode']
    if not qnode_dict:
        raise web_exceptions.InvalidRequestException('No qnode provided')
    item = qnode_dict["id"]
    value = request.get_json()['value']
    context = request.get_json().get("context", "")
    selection = request.get_json()['selection']

    if not selection:
        raise web_exceptions.InvalidRequestException('No selection provided')
    top_left, bottom_right = selection
    col1, row1 = top_left
    col2, row2 = bottom_right

    df_rows = []
    for col in range(col1, col2+1):
        for row in range(row1, row2+1):
            df_rows.append([col, row, value, context, item,
                            data_file_name, sheet_name])
    df = pd.DataFrame(df_rows, columns=[
                      "column", "row", "value", "context", "item", "file", "sheet"])

    filepath = os.path.join(project.directory, "user-input-wikification.csv")
    if os.path.exists(filepath):
        #clear any clashes/duplicates
        org_df=pd.read_csv(filepath)
        if 'file' not in org_df:
            org_df['file']=''
        if 'sheet' not in org_df:
            org_df['sheet']=''

        df=pd.concat([org_df, df]).drop_duplicates(subset=['row', 'column', 'value', 'file', 'sheet'], keep='last').reset_index(drop=True)


    df.to_csv(filepath, index=False, header=True)

    project.add_wikifier_file(filepath)
    project.save()

    # build response-- projectDTO in case we added a file, qnodes layer to update qnodes with new stuff
    # if we want to update statements to reflect the changes to qnode we might need to rerun the whole calculation?

    response = dict(project=get_project_dict(project))
    response["layers"] = get_qnodes_layer(calc_params)

    return response, 200

@app.route('/api/remove_qnode', methods=['POST'])
@json_response
def remove_qnode():
    project = get_project()
    calc_params = get_calc_params(project)
    sheet_name=calc_params.sheet.name
    data_file_name=calc_params.sheet.data_file_name
    qnode_dict = request.get_json()['qnode']
    if not qnode_dict:
        raise web_exceptions.InvalidRequestException('No qnode provided')

    item=qnode_dict["id"]
    value = request.get_json()['value']
    context = request.get_json().get("context", "")
    selection = request.get_json()['selection']
    if not selection:
        raise web_exceptions.InvalidRequestException('No selection provided')

    top_left, bottom_right=selection
    col1, row1 = top_left
    col2, row2 = bottom_right

    filepath=os.path.join(project.directory, "user-input-wikification.csv")
    if os.path.exists(filepath):
        df=pd.read_csv(filepath)
        for col in range(col1, col2+1):
            for row in range(row1, row2+1):
                df= df.drop(df[(df['column'] == col)
                                & (df['row'] == row)
                                & (df['value'] == value)
                                & (df['file'] == data_file_name)
                                & (df['sheet'] == sheet_name)].index)
        df.to_csv(filepath, index=False, header=True)

    response= dict(project=get_project_dict(project))
    response["layers"] = get_qnodes_layer(calc_params)

    return response, 200


@app.route('/api/files/rename', methods=['POST'])
@json_response
def rename_file():
    project = get_project()

    old_name = request.get_json()["old_name"]
    new_name = request.get_json()["new_name"]

    project.rename_file_in_project(old_name, new_name, rename_in_fs=True)
    project.save()

    response = dict(project=get_project_dict(project))
    return response, 200


@app.route('/api/files/delete', methods=['POST'])
@json_response
def delete_file():
    project = get_project()

    file_name = request.get_json()["file_name"]
    delete_from_fs = request.get_json()["delete"]

    project.delete_file_from_project(file_name, delete_from_fs=delete_from_fs)
    project.save()

    response = dict(project=get_project_dict(project))
    return response, 200


@app.route('/api/files/add_mapping', methods=['POST'])
@json_response
def add_mapping_file():
    project = get_project()
    dataFile = request.get_json()["dataFile"]
    sheet_name = request.get_json()["sheetName"]
    title = request.get_json()["title"]
    type = request.get_json()["type"]

    if type == "yaml":
        filename = project.add_yaml_file(title, dataFile, sheet_name, True)

    if type == "annotation":
        filename = project.add_annotation_file(
            title, dataFile, sheet_name, True)

    project.save()
    response = dict(project=get_project_dict(project), filename=filename)
    return response, 200


@app.route('/api/web/wikify_region', methods=['POST'])
@json_response
def causx_wikify():
    project = get_project()
    region = request.get_json()["selection"]
    #context = request.get_json()["context"]
    calc_params = get_calc_params(project)

    cell_qnode_map, problem_cells = wikify_countries(calc_params, region)
    file_path = save_dataframe(
        project, cell_qnode_map, "wikify_region_output.csv")
    file_path = project.add_wikifier_file(
        file_path,  copy_from_elsewhere=True, overwrite=True)
    project.save()

    calc_params = get_calc_params(project)
    response = dict(project=get_project_dict(project))
    response["layers"] = get_qnodes_layer(calc_params)

    if problem_cells:
        response['wikifierError'] = "Failed to wikify: " + \
            ",".join(problem_cells)

    return response, 200



##for web version

@app.route('/api/upload/<type>', methods=['POST'])
@json_response
def upload_file(type):
    project = get_project()

    allowed_types_map = {
        "data": [".csv", ".xlsx"],
        "annotation": [".json", ".annotation"],
        "wikifier": [".csv"],
        "entities": [".tsv"]
    }

    if 'file' not in request.files:
        raise web_exceptions.NoFilePartException(
            "Missing 'file' parameter in the file upload request")

    in_file = request.files['file']
    if in_file.filename == '':
        raise web_exceptions.BlankFileNameException(
            "No file selected for uploading")

    allowed_extensions = allowed_types_map[type]
    file_extension = Path(in_file.filename).suffix
    file_allowed = file_extension in allowed_extensions
    if not file_allowed:
        raise web_exceptions.FileTypeNotSupportedException(
            "File with extension '"+file_extension+"' is not allowed")

    folder = Path(project.directory)
    # otherwise secure_filename does weird things on linux
    shorter_name = Path(in_file.filename).name
    filename = secure_filename(shorter_name)
    file_path = folder/filename
    in_file.save(str(file_path))

    response= dict()
    code=200

    if type == "data":
        file_path=project.add_data_file(file_path)
        sheet_name=project.data_files[file_path]["val_arr"][0]
        project.save()
        response["sheetName"]=sheet_name
        calc_params=CalcParams(project, file_path, sheet_name)
        response["table"] = get_table(calc_params)

    if type == "wikifier":
        file_path=project.add_wikifier_file(file_path)
    if type == "entities":
        file_path=project.add_entity_file(file_path)
    if type == "annotation":
        calc_params = get_calc_params(project)
        file_path=project.add_annotation_file(file_path, calc_params.data_path, calc_params.sheet_name)
        mapping_response, code = get_mapping(file_path, "Annotation")
        response.update(mapping_response)

    project.save()
    response.update(dict(project=get_project_dict(project), filepath=file_path))
    return response, code



##app utils

@app.route('/api/is-alive')
def is_alive():
    return 'Backend is here', 200

@app.route('/api/get-version', methods=["GET"])
def get_api_version():
    import pkg_resources
    return pkg_resources.get_distribution('t2wml-api').version, 200

@app.route('/api/windows/add-to-path', methods=['POST'])
def windows_add_to_path():
    if sys.platform != 'win32':
        raise web_exceptions.InvalidRequestException(
            "path can only be set on Windows")

    path = request.args.get('path')
    if not path:
        raise web_exceptions.InvalidRequestException(
            "path parameter not specified")

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
