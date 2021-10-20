import json
from flask.helpers import send_file
import pandas as pd
import os
import sys
import requests
from io import BytesIO
from pathlib import Path
from flask import request
from t2wml.spreadsheets.sheet import Sheet
from t2wml.wikification.utility_functions import dict_to_kgtk, kgtk_to_dict
from causx.wikification import wikify_countries
from copy_annotations.copy_annotations import copy_annotation
import web_exceptions
from app_config import NumpyEncoder, app
from t2wml.api import add_entities_from_file, annotation_suggester, get_Pnode, get_Qnode, t2wml_settings, Wikifier
from t2wml_web import (create_zip, get_kg, autocreate_items, get_kgtk_download_and_variables,
                       set_web_settings, get_layers, get_annotations, get_table, save_annotations,
                       get_project_instance, create_api_project, get_partial_csv, get_qnodes_layer,
                       suggest_annotations, update_entities, update_t2wml_settings, get_entities)
from utils import (file_upload_validator, get_empty_layers, get_tuple_selection,
                   get_yaml_content, save_yaml, create_user_wikification)
from web_exceptions import WebException, make_frontend_err_dict
from calc_params import CalcParams
from global_settings import global_settings
import path_utils
from wikidata_utils import get_labels_and_descriptions
from wikification import wikify_selection

debug_mode = False

set_web_settings()


def get_project_folder():
    """convenience function for getting project folder from request parameters"""
    try:
        project_folder = request.args['project_folder']
        return project_folder
    except KeyError:
        raise web_exceptions.InvalidRequestException(
            "project folder parameter not specified")


def get_project():
    """convenience function for getting project instance using request parameters"""
    project_folder = get_project_folder()
    project = get_project_instance(project_folder)
    return project


def get_project_dict(project):
    """because the frontend expects global settings (which aren't part of project class) as
    part of the project dict, this convenience function updates the project dict accordingly"""
    return_dict = {}
    return_dict.update(project.__dict__)
    return_dict.update(global_settings.__dict__)
    return return_dict


def json_response(func):
    """a wrapping function that centralizes handling requests
    (mostly by standardizing return of any errors)"""
    def wrapper(*args, **kwargs):
        try:
            data, return_code = func(*args, **kwargs)
            return data, return_code
        except WebException as e:
            data = {"error": e.error_dict}
            return data, e.code
        except Exception as e:
            # print(e)
            if "Permission denied" in str(e):
                e = web_exceptions.FileOpenElsewhereError(
                    "Check whether a file you are trying to edit is open elsewhere on your computer: "+str(e))
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
    """convenience function for updating mapping file in calc_params"""
    if mapping_type == "Annotation":
        calc_params._annotation_path = mapping_file
    if mapping_type == "Yaml":
        calc_params._yaml_path = mapping_file

def get_range_params():
    """convenience function for fetching range parameters from request"""
    start_end_kwargs = {}
    for key in ["data_start", "map_start"]:#, "part_start"]:
        start_end_kwargs[key] = int(request.args.get(key, 0))
    for key in ["data_end", "map_end"]:
        end = int(request.args.get(key, 0))
        if end == 0:
            end = None
        start_end_kwargs[key] = end
    #start_end_kwargs["part_end"] = int(request.args.get("part_end", 30))
    start_end_kwargs["part_count"] = int(request.args.get("part_count", 100))
    return start_end_kwargs


def get_calc_params(project, data_required=True, mapping_type=None, mapping_file=None):
    """convenience function for building CalcParams instance for a request

    Args:
        project (Project): the project for the request (fetched separately)
        data_required (bool, optional): are data params required for the request? if so, raise an error if not present. Defaults to True.
        mapping_type (string, optional): "Annotation" or "Yaml". Defaults to None.
        mapping_file (string, optional): relative path from project directory to mapping file. Defaults to None.

    Raises:
        web_exceptions.InvalidRequestException: missing data file or missing sheet

    Returns:
        CalcParams: instance of CalcParams matching the request params
    """
    try:
        try:
            data_file = request.args['data_file']
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

    start_end_kwargs=get_range_params()

    calc_params = CalcParams(
        project, data_file, sheet_name, **start_end_kwargs)

    mapping_type = mapping_type or request.args.get("mapping_type")
    mapping_file = mapping_file or request.args.get("mapping_file")
    update_calc_params_mapping_files(
        project, calc_params, mapping_file, mapping_type)

    return calc_params


############# heavy getters: ###############


@app.route('/api/mapping', methods=['GET'])
@json_response
def get_mapping(mapping_file=None, mapping_type=None):
    """get mapping-related layers (and qnode layer) for request
    this function is also used by the following endpoints:
    /api/annotation/guess-blocks, /api/table, /api/annotation, /api/yaml/save
    """
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
    """gets the tableDTO and also attempts to fetch layers"""
    project = get_project()
    data_file = request.args.get('data_file')
    if not data_file:
        response = dict(layers=get_empty_layers(), table=[[]])
        return response, 200
    calc_params = get_calc_params(project)
    response = dict()

    response["table"] = get_table(calc_params)
    calc_response, code = get_mapping()
    response.update(calc_response)
    return response, code


@app.route('/api/annotation/guess-blocks', methods=['GET'])
@json_response
def guess_all_annotation_blocks():
    """gets a guessed annotation for table, saves annotation file to FS and project,
    and attempts to return layers"""
    project = get_project()
    calc_params = get_calc_params(project)
    suggest_annotations(calc_params)
    return get_mapping()


@app.route('/api/partialcsv', methods=['GET'])
@json_response
def partial_csv():
    """fetch partial csv
    (no type validation, attempts to fetch main subject even without variable+property)"""
    project = get_project()
    calc_params = get_calc_params(project)
    response = dict()

    try:
        response["partialCsv"] = get_partial_csv(calc_params)
    except Exception as e:
        # print(e)
        response["partialCsv"] = dict(dims=[1, 3],
                                      firstRowIndex=0,
                                      cells=[["subject", "property", "value"]])
    return response, 200


@app.route('/api/project/export/<filetype>/all', methods=['POST'])
@app.route('/api/project/export/<filetype>', methods=['POST'])
@json_response
def export_results(filetype):
    """
    save results in format <filetype> to filesystem
    """
    project = get_project()
    if filetype == "csv":
        from t2wml.settings import t2wml_settings
        t2wml_settings.no_wikification = True
    filepath = request.get_json()["filepath"]
    response = dict()

    if str(request.url_rule)[-3:] == "all":
        with open(filepath, 'wb') as f:
            create_zip(project, filetype, f)

    else:
        calc_params = get_calc_params(project)
        if not calc_params.yaml_path and not calc_params.annotation_path:
            raise web_exceptions.CellResolutionWithoutYAMLFileException(
                "Cannot download report without uploading mapping file first")
        kg = get_kg(calc_params)
        with open(filepath, 'w', encoding="utf-8") as f:
            f.write(kg.get_output(filetype, calc_params.project))
        #response["error"] = None
        #response["internalErrors"] = kg.errors if kg.errors else None
    return response, 200


@app.route('/api/project/datamart', methods=['GET'])
@json_response
def load_to_datamart():
    """currently this endpoint is mostly defunct"""
    project = get_project()
    calc_params = get_calc_params(project)
    download_output, variables = get_kgtk_download_and_variables(
        calc_params, validate_for_datamart=True)
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


# POSTS/PUTS:


@app.route('/api/data', methods=['POST'])
@json_response
def upload_data_file():
    """
    save data_file to project directory and to project class, return table DTO
    """
    project = get_project()

    file_path = file_upload_validator({'.xlsx', '.xls', '.csv', '.tsv'})
    data_file = project.add_data_file(
        file_path, copy_from_elsewhere=True, overwrite=True)
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

    start_end_kwargs=get_range_params()
    calc_params = CalcParams(
        project, data_file, sheet_name, **start_end_kwargs)


    response["table"] = get_table(calc_params)
    # this will just return empty layers and any wikification if it exists
    get_layers(response, calc_params)

    return response, 200


@app.route('/api/project/entities', methods=['POST'])
@json_response
def upload_entities():
    """save entities file to project directory and project class,
    load entities into web_dictionary_provider,
    return qnodes layer"""
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


@app.route('/api/web/wikify_region', methods=['POST'])  # V
@json_response
def causx_wikify():
    """for convenience, replicate access to the causx country-specific wikifier
    (we frwuently need it in the desktop version as well, particularly with annotation suggestion)
    wikifies cells in "selection" and saves them to the wikifier,
    returns qnode layer"""
    project = get_project()
    selection = request.get_json()["selection"]
    selection = get_tuple_selection(selection)

    overwrite_existing = request.get_json().get("overwrite", False)
    #context = request.get_json()["context"]
    calc_params = get_calc_params(project)

    cell_qnode_map, problem_cells = wikify_countries(calc_params, selection)
    project.add_df_to_wikifier_file(
        calc_params.sheet, cell_qnode_map, overwrite_existing)

    calc_params = get_calc_params(project)
    response = dict(project=get_project_dict(project))
    response["layers"] = get_qnodes_layer(calc_params)

    if problem_cells:
        response['wikifierError'] = "Failed to wikify: " + \
            ",".join(problem_cells)

    return response, 200


@app.route('/api/wikifier', methods=['POST'])
@json_response
def upload_wikifier_output():
    """
    This function uploads a wikifier file.
    It essentially allow backwards-compatible support for projects
    where an old-style wikifier file is still used
    returns qnode layer
    """
    project = get_project()

    file_path = file_upload_validator({".csv"})
    project.add_old_style_wikifier_to_project(file_path)
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
    This function calls the wikifier service to wikifiy a region,
    and deletes/updates wiki region file's results
    returns qnode layer
    :return:
    """
    project = get_project()
    calc_params = get_calc_params(project)
    overwrite_existing = request.get_json().get("overwrite", False)
    selection = request.get_json()['selection']

    selection = get_tuple_selection(selection)

    wiki_dict, entities_dict, problem_cells = wikify_selection(calc_params, selection)
    t2wml_settings.wikidata_provider.cache.update(entities_dict)
    project.add_dict_to_wikifier_file(
        calc_params.sheet, wiki_dict, overwrite_existing)

    calc_params = get_calc_params(project)
    response = dict(project=get_project_dict(project))
    response["layers"] = get_qnodes_layer(calc_params)

    if problem_cells:
        response['wikifierError'] = "Failed to wikify: " + \
            ",".join(problem_cells)

    return response, 200


@app.route('/api/auto_wikinodes', methods=['POST'])
@json_response
def create_auto_nodes():
    """
    Creates auto-nodes (Ie PCustomNode-label, QCustomNode-label) for the `selection`
    if `is_property` is True then `data_type` must be provided
    returns qnode layer
    """
    project = get_project()
    calc_params = get_calc_params(project)
    selection = request.get_json()['selection']
    selection = get_tuple_selection(selection)
    is_property = request.get_json()['is_property']
    data_type = request.get_json().get("data_type", None)
    autocreate_items(calc_params, selection, is_property, data_type)
    response = dict(project=get_project_dict(project))
    response["layers"] = get_qnodes_layer(calc_params)
    return response, 200


@app.route('/api/yaml/save', methods=['POST'])
@json_response
def upload_yaml():
    """save a yaml file string to a file without generating layers.
    used for creating yaml files or for saving them when switching tabs"""
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
    Save a yaml file string to a file and generate layers using that yaml file
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


@app.route('/api/annotation/create', methods=['POST'])
@json_response
def upload_annotation():
    """save an annotation to a file without generating layers.
    used for creating annotation files"""
    project = get_project()
    dataFile = request.get_json()["dataFile"]
    sheet_name = request.get_json()["sheetName"]
    title = request.get_json()["title"]
    annotations_path = Path(project.directory) / title
    os.makedirs(Path(annotations_path.parent), exist_ok=True)
    filename = save_annotations(
        project, [], annotations_path, dataFile, sheet_name)
    response = dict(project=get_project_dict(project), filename=filename)
    return response, 200


@app.route('/api/annotation', methods=['POST'])
@json_response
def apply_annotation():
    """
    Save an annotation to a file and generate layers using that annotation
    """
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

################# Copying annotations

class CopyAnnotationParams:
    """class used solely for copying annotations"""
    def __init__(self, dataFile, sheetName, dir, annotation, source=False):
        self.dir = dir
        self.data_file=dataFile
        if not sheetName:
            sheetName = Path(dataFile).name
        self.sheet_name=sheetName
        self.annotation_path = os.path.join(dir, annotation)
        self.data_path = os.path.join(dir, dataFile)
        self.sheet = Sheet(self.data_path, self.sheet_name)
        if source:
            with open(self.annotation_path, 'r') as f:
                self.annotation=json.load(f)


@app.route('/api/annotation/copy', methods=['POST'])
@json_response
def upload_annotation_for_copying():
    """copy an annotation from source params (sheet, annotation) to destination,
    including adjusting to fit destination sheet, saving to filesystem, and adding to project
    returns project dictionary containing new annotation file"""
    project = get_project()

    source_params = CopyAnnotationParams(source=True, **(request.get_json()["source"]))
    destination_params = CopyAnnotationParams(**(request.get_json()["destination"]))
    try:
        processed_annotation = copy_annotation(source_params.annotation, source_params.sheet.data, destination_params.sheet.data)
    except:
        processed_annotation = []
    with open(destination_params.annotation_path, 'w') as f:
        f.write(json.dumps(processed_annotation, cls=NumpyEncoder))

    project.add_annotation_file(destination_params.annotation_path, destination_params.data_path, destination_params.sheet_name)
    response = dict(project = get_project_dict(project), annotation=processed_annotation)
    return response, 200


###########################################


@app.route('/api/set_qnode', methods=['POST'])
@json_response
def set_qnodes():
    project = get_project()
    calc_params = get_calc_params(project)
    qnode_dict = request.get_json()['qnode']
    if not qnode_dict:
        raise web_exceptions.InvalidRequestException('No qnode provided')
    item = qnode_dict["id"]
    value = request.get_json()['value']
    context = request.get_json().get("context", "")
    selection = request.get_json()['selection']
    selection = get_tuple_selection(selection)


    if not selection:
        raise web_exceptions.InvalidRequestException('No selection provided')

    create_user_wikification(calc_params, project,
                             selection, value, context, item)

    # build response-- projectDTO in case we added a file, qnodes layer to update qnodes with new stuff
    # if we want to update statements to reflect the changes to qnode we might need to rerun the whole calculation?

    response = dict(project=get_project_dict(project))
    response["layers"] = get_qnodes_layer(calc_params)

    return response, 200


@app.route('/api/delete_wikification', methods=['POST'])
@json_response
def delete_wikification():
    """delete wikification from a selection on the sheet
    returns qnode layer"""
    project = get_project()
    calc_params = get_calc_params(project)
    sheet_name = calc_params.sheet.name
    data_file_name = calc_params.sheet.data_file_name

    selection = request.get_json()['selection']
    if not selection:
        raise web_exceptions.InvalidRequestException('No selection provided')
    selection = get_tuple_selection(selection)


    value = request.get_json().get('value', None)
    #context = request.get_json().get("context", "")

    filepath, exists=project.get_wikifier_file(calc_params.sheet.data_file_path)
    if exists:
        wikifier = Wikifier.load_from_file(filepath)
        wikifier.delete_wikification(selection, value, context="", sheet=calc_params.sheet)
        wikifier.save_to_file(filepath)

    response = dict(project=get_project_dict(project))
    response["layers"] = get_qnodes_layer(calc_params)

    return response, 200


@app.route('/api/create_node', methods=['POST'])
@json_response
def create_qnode():
    """create a custom qnode"""
    project = get_project()
    request_json = request.get_json()
    try:
        label = request_json.pop("label")
        # is_prop=node_id[0].lower()=="p"
        is_prop = request_json.pop("is_property")
        if is_prop:
            data_type = request_json.pop("data_type")
            if data_type not in ["globecoordinate", "quantity", "time", "string", "monolingualtext", "externalid", "wikibaseitem", "wikibaseproperty", "url"]:
                raise web_exceptions.InvalidRequestException(
                    "Invalid data type")
    except KeyError:
        raise web_exceptions.InvalidRequestException(
            "Missing required fields in entity definition")

    filepath = Path(project.directory)/"user_input_properties.tsv"
    if os.path.isfile(filepath):
        custom_nodes = kgtk_to_dict(filepath)
    else:
        custom_nodes = dict()

    id = request.json.get("id", None)
    if not id:
        if is_prop:
            node_id = get_Pnode(project, label)
        else:
            node_id = get_Qnode(project, label)

    entity_dict = {
        "id": node_id,
        "label": label,
    }
    if is_prop:
        entity_dict["data_type"] = data_type
    entity_dict["description"] = request_json.get("description", "")

    for key in ["P31"]:  # may add more
        if request_json.get(key, None):
            entity_dict[key] = request_json[key]

    custom_nodes[node_id] = entity_dict
    dict_to_kgtk(custom_nodes, filepath)
    project.add_entity_file(filepath)
    project.save()
    t2wml_settings.wikidata_provider.save_entry(node_id, **entity_dict)

    response = dict(entity=entity_dict, project=get_project_dict(project))

    selection = request_json.get("selection", None)
    if selection:
        selection = get_tuple_selection(selection)
        calc_params = get_calc_params(project)
        context = request.get_json().get("context", "")
        value = request_json.pop("value")
        create_user_wikification(calc_params, project, selection, value,
                                 context, node_id)
        response["layers"] = get_qnodes_layer(calc_params)
    else:
        response["layers"] = {}
    return response, 200


###### Small getters that return small things and *should* be cheap operations

@app.route('/api/project', methods=['GET'])
@json_response
def get_project_files():
    """returns project"""
    project = get_project()
    response = dict(project=get_project_dict(project))
    return response, 200


# sure, it's technically a post, but functionally it's "getting" a working project dir
@app.route('/api/project', methods=['POST'])
@json_response
def create_project():
    """
    creates and returns project in provided folder
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




@app.route('/api/files/add_mapping', methods=['POST'])
@json_response
def add_existing_mapping_file_to_project():
    """returns project"""
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




@app.route('/api/project/entities', methods=['GET'])
@json_response
def get_project_entities():
    """returns entities"""
    project = get_project()
    response = get_entities(project)
    return response, 200



@app.route('/api/project/entities', methods=['PUT'])
@json_response
def edit_entities():
    """returns entities"""
    project = get_project()
    entity_file = request.get_json()["entity_file"]
    updated_entries = request.get_json()["updated_entries"]
    response = update_entities(project, entity_file, updated_entries)
    return response, 200


@app.route('/api/annotation/suggest', methods=['PUT'])
@json_response
def guess_block_type_role():
    """returns a single annotation block"""
    project = get_project()
    calc_params = get_calc_params(project)
    block = request.get_json()["selection"]
    if not isinstance(block, dict): #the rare reverse selection!
        (x1, y1), (x2, y2) = block
        block = {"x1": x1+1, "x2": x2+1, "y1": y1+1, "y2": y2+1}

    annotation = request.get_json()["annotations"]



    response = {  # fallback response
        # drop metadata
        "roles": ["dependentVar", "mainSubject", "property", "qualifier", "unit"],
        # drop monolingual string
        "types": ["string", "quantity", "time", "wikibaseitem"],
        "children": {}
    }

    try:
        response = annotation_suggester(calc_params.sheet, block, annotation)
    except Exception as e:
        pass  # print(e)
    return response, 200


@app.route('/api/project/globalsettings', methods=['PUT', 'GET'])
@json_response
def update_global_settings():
    """returns global settings dictionary"""
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
    returns project including settings and global settings
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
    """query the isi endpoint for properties or items matching the query string
    returns query results"""
    q = request.args.get('q')
    if not q:
        raise web_exceptions.InvalidRequestException("No search parameter set")

    # construct the url with correct parameters for kgtk search
    url = 'https://kgtk.isi.edu/api?q={}'.format(q)

    if "properties" in request.url:
        url += '&type=ngram&extra_info=true&language=en&item=property'
        data_type = request.args.get('data_type')
        if data_type:
            if data_type == "wikibaseitem":
                data_type = "wikibase-item"
            url += '&data_type={}'.format(data_type)

    else:  # qnodes
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


@app.route('/api/query_node/<id>', methods=['GET'])
@json_response
def query_qnode(id):
    """query the existing database and fallback to sparql for the label and description of a qnode
    returns dictionary for the qnode"""
    project = get_project()
    calc_params = get_calc_params(project)
    response = get_labels_and_descriptions(t2wml_settings.wikidata_provider, [
                                           id], calc_params.sparql_endpoint)
    result = response.get(id)
    if result:
        result["id"] = id
        return result, 200
    else:
        return {}, 404


@app.route('/api/files/rename', methods=['POST'])
@json_response
def rename_file():
    """rename a file in the project
    returns project dictionary with renamed file"""
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
    """delete a file from the project (and, optionally, from the file system)
    returns a project dictionary with the file deleted"""
    project = get_project()

    file_name = request.get_json()["file_name"]
    delete_from_fs = request.get_json()["delete"]

    project.delete_file_from_project(file_name, delete_from_fs=delete_from_fs)
    project.save()

    response = dict(project=get_project_dict(project))
    return response, 200


# app utils

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
