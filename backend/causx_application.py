from flask.helpers import make_response, send_file
import pandas as pd
import os
import sys
import tempfile
import json
import zipfile
import uuid
import datetime
import jwt
from io import BytesIO
from pathlib import Path
from flask import request
from t2wml.api import create_nodes_from_selection
from werkzeug.utils import secure_filename
from app_config import app, BASEDIR, NumpyEncoder
from t2wml.project import Project, FileNotPresentInProject, InvalidProjectDirectory
from t2wml.wikification.utility_functions import dict_to_kgtk, kgtk_to_dict
from t2wml.spreadsheets.utilities import PandasLoader
from t2wml.api import annotation_suggester, get_Pnode, get_Qnode, t2wml_settings, Wikifier
from copy_annotations.copy_annotations import copy_annotation
from t2wml_web import ( get_kg, autocreate_items, set_web_settings,
                        get_annotations, get_table, save_annotations,get_project_instance,
                       suggest_annotations,  update_t2wml_settings, get_entities)
import web_exceptions
from causx.causx_utils import causx_get_variable_dict, causx_get_variable_metadata, causx_set_variable, create_fidil_json, get_causx_partial_csv, causx_create_canonical_spreadsheet, include_base_causx_tags, upload_fidil_json
from causx.causx_utils import causx_get_layers as get_layers
from causx.causx_utils import causx_get_qnodes_layer as get_qnodes_layer
from causx.wikification import wikify_countries
from utils import create_user_wikification, get_tuple_selection
from web_exceptions import WebException, make_frontend_err_dict
from calc_params import CalcParams
from global_settings import global_settings



debug_mode = False

set_web_settings()

try:
    os.makedirs(app.config["PROJECTS_DIR"], exist_ok=True)
except:
    app.config["PROJECTS_DIR"] = os.path.join(BASEDIR, "media")
    os.makedirs(app.config["PROJECTS_DIR"], exist_ok=True)


def encode_auth_token():
    """Generates the auth token

    Returns:
        str: encoded token
    """
    payload = {
            'iat': datetime.datetime.utcnow(),
            'sub': str(uuid.uuid4())
        }
    return jwt.encode(
            payload,
            app.config.get('SECRET_KEY'),
            algorithm='HS256'
        )


def decode_auth_token(auth_token):
    """decodes provided token into session-specific project directory

    Args:
        auth_token (json token): token from request

    Returns:
        str: project ID used for making project dir
    """
    payload = jwt.decode(auth_token, app.config.get('SECRET_KEY'), algorithms=['HS256'])
    return payload['sub']


def get_project_folder():
    """use the Authentication header to get (or create, as necessary) the project folder"""
    auth_header=request.headers.get("Authentication")
    request_folder=decode_auth_token(auth_header)
    base_dir=app.config["PROJECTS_DIR"]
    project_folder= Path(base_dir) / request_folder
    os.makedirs(project_folder, exist_ok=True)
    return project_folder


def get_project():
    """get or create the project instance"""
    project_folder = get_project_folder()
    try:
        Project.load(project_folder)
    except FileNotPresentInProject:
        p=Project(project_folder, title="Causx", sparql_endpoint = "DO NOT QUERY")
        p.save()

    project = get_project_instance(project_folder)
    project.sparql_endpoint = "DO NOT QUERY"
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
            data, code = func(*args, **kwargs)
        except WebException as e:
            data = {"error": e.error_dict}
            code = e.code
        except Exception as e:
            if "Permission denied" in str(e):
                e = web_exceptions.FileOpenElsewhereError(
                    "Check whether a file you are trying to edit is open elsewhere on your computer: "+str(e))
                data = {"error": e.error_dict}
                code=403

            data = {"error": make_frontend_err_dict(e)}
            try:
                code = e.code
                data["error"]["errorCode"] = code
            except AttributeError:
                code = 500
        finally:
            response=make_response(data)
            response.status_code=code
            return response, code

    wrapper.__name__ = func.__name__  # This is required to avoid issues with flask
    return wrapper

def get_annotation_name(calc_params):
    """get the name of an annotation file for a specific sheet (only one annotation per sheet)
    creates the directory for it as necessary"""
    data_file=calc_params.data_path
    sheet_name=calc_params.sheet_name
    annotation_path = "annotations/" + Path(data_file).stem + "_" + Path(sheet_name).stem + ".annotation"
    os.makedirs(Path(calc_params.project.directory)/"annotations", exist_ok=True)
    return annotation_path

def undefined_work_around(key, default):
    """convenience function for range params, that sets them to default if they are undefined"""
    val = request.args.get(key, default)
    if str(val)=="undefined":
        val=default
    return val


def get_range_params():
    """convenience function for fetching range parameters from request"""
    start_end_kwargs = {}
    for key in ["data_start", "map_start"]:#, "part_start"]:

        start_end_kwargs[key] = int(undefined_work_around(key, 0))
    for key in ["data_end", "map_end"]:
        end = int(undefined_work_around(key, 0))
        if end == 0:
            end = None
        start_end_kwargs[key] = end
    #start_end_kwargs["part_end"] = int(request.args.get("part_end", 30))
    start_end_kwargs["part_count"] = int(undefined_work_around("part_count", 100))
    return start_end_kwargs


def get_calc_params(project, data_required=True):
    """convenience function for building CalcParams instance for a request

    Args:
        project (Project): the project for the request (fetched separately)
        data_required (bool, optional): are data params required for the request? if so, raise an error if not present. Defaults to True.
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
    calc_params = CalcParams(project, data_file, sheet_name, **start_end_kwargs)

    calc_params._annotation_path = get_annotation_name(calc_params)

    return calc_params


def get_mapping():
    """get mapping-related layers (and qnode layer) for request
    this function is also used by the following endpoints:
    /api/causx/table, /api/causx/annotation, /api/causx/upload/annotation
    """
    project = get_project()
    calc_params = get_calc_params(project)
    response = dict(project=get_project_dict(project))
    response["annotations"], response["yamlContent"] = get_annotations(
            calc_params)
    get_layers(response, calc_params)
    return response, 200


@app.route('/api/is-alive')
def is_alive1():
    return 'Causx Backend is here', 200

@app.route('/api/causx/is-alive')
def is_alive2():
    return 'Causx Backend is here', 200

@app.route('/api/causx/token', methods=['GET'])
def get_token():
    """request to get token for session"""
    return {"token": encode_auth_token()}, 200


@app.route('/api/causx/table', methods=['GET'])
@json_response
def causx_get_data():
    """gets the tableDTO and also attempts to fetch layers"""
    project = get_project()
    calc_params = get_calc_params(project)
    response = dict()
    response["table"] = get_table(calc_params)
    calc_response, code = get_mapping()
    response.update(calc_response)
    return response, code


@app.route('/api/causx/project/entities', methods=['GET']) #V
@json_response
def get_project_entities_for_causx():
    """returns entities"""
    project = get_project()
    response = get_entities(project)
    return response, 200


@app.route('/api/causx/auto_wikinodes', methods=['POST'])
@json_response
def create_auto_nodes_for_causx():
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


@app.route('/api/causx/annotation', methods=['POST'])
@json_response
def upload_annotation_for_causx():
    """
    Save an annotation to a file and generate layers using that annotation
    """
    project = get_project()
    calc_params = get_calc_params(project)
    annotation = request.get_json()["annotations"]
    save_annotations(project, annotation, calc_params.annotation_path,
                     calc_params.data_path, calc_params.sheet_name)
    response = dict(project=get_project_dict(project))
    calc_response, code = get_mapping()
    response.update(calc_response)
    return response, code


@app.route('/api/causx/annotation/suggest', methods=['PUT'])
@json_response
def guess_block_parts_for_causx():
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
        pass #print(e)
    return response, 200


@app.route('/api/causx/annotation/guess-blocks', methods=['GET']) #V
@json_response
def guess_annotation_blocks_for_causx():
    """gets a guessed annotation for table, saves annotation file to FS and project,
    and attempts to return layers"""
    project = get_project()
    calc_params = get_calc_params(project)
    suggest_annotations(calc_params)
    response=dict()
    response["annotations"], response["yamlContent"] = get_annotations(calc_params)
    return response, 200


@app.route('/api/causx/project/settings', methods=['PUT', 'GET']) #V
@json_response
def update_settings_for_causx():
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


@app.route('/api/causx/delete_wikification', methods=['POST'])
@json_response
def delete_wikification_for_causx():
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


@app.route('/api/causx/create_node', methods=['POST'])
@json_response
def create_qnode_for_causx():
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
        (col1, row1), (col2, row2) = selection
        value = calc_params.sheet[row1, col1]
        create_user_wikification(calc_params, project, selection, value,
                                 context, node_id)
        response["layers"] = get_qnodes_layer(calc_params)
    else:
        response["layers"] = {}
    return response, 200


def causx_get_file(allowed_extensions):
    """helper function for verifying files"""
    if 'file' not in request.files:
        raise web_exceptions.NoFilePartException(
            "Missing 'file' parameter in the file upload request")

    in_file = request.files['file']
    if in_file.filename == '':
        raise web_exceptions.BlankFileNameException(
            "No file selected for uploading")


    file_extension = Path(in_file.filename).suffix
    file_allowed = file_extension in allowed_extensions
    if not file_allowed:
        raise web_exceptions.FileTypeNotSupportedException(
            "File with extension '"+file_extension+"' is not allowed")
    return in_file


@app.route('/api/causx/wikify_region', methods=['POST']) #V
@json_response
def causx_wikify_for_causx():
    """wikify a region: first through the country wikifier
    and then through automatic node creation for the remainder"""
    project = get_project()
    selection = request.get_json()["selection"]
    selection = get_tuple_selection(selection)

    overwrite_existing = request.get_json().get("overwrite", False)
    #context = request.get_json()["context"]
    calc_params = get_calc_params(project)

    cell_qnode_map, problem_cells = wikify_countries(calc_params, selection)
    project.add_df_to_wikifier_file(calc_params.sheet, cell_qnode_map, overwrite_existing)
    #auto-create nodes for anything that failed to wikify
    create_nodes_from_selection(selection, project, calc_params.sheet, calc_params.wikifier)

    calc_params = get_calc_params(project)
    response = dict(project=get_project_dict(project))
    response["layers"] = get_qnodes_layer(calc_params)

    if problem_cells:
        response['wikifierError'] = "Failed to wikify: " + \
            ",".join(problem_cells)

    return response, 200

@app.route('/api/causx/upload/data', methods=['POST'])
@json_response
def causx_upload_data():
    """upload a data file, save to fs, add to filesystem,
    return tableDTO"""
    project = get_project()
    in_file=causx_get_file([".csv", ".xlsx", ".t2wmlz"])
    if Path(in_file.filename).suffix == ".t2wmlz": #redirect
        response, code = causx_upload_project()
        return response, code

    folder = Path(project.directory)
    shorter_name = Path(in_file.filename).name
    filename = secure_filename(shorter_name)
    file_path = folder/filename
    in_file.save(str(file_path))

    response = dict()
    code = 200

    file_path = project.add_data_file(file_path)
    sheet_name = project.data_files[file_path]["val_arr"][0]
    project.save()
    response["sheetName"] = sheet_name

    start_end_kwargs=get_range_params()
    calc_params = CalcParams(project, file_path, sheet_name, **start_end_kwargs)

    response["table"] = get_table(calc_params)
    project.title=Path(file_path).stem
    project.save()
    response.update(dict(project=get_project_dict(project), filepath=file_path))
    return response, code

@app.route('/api/causx/upload/project', methods=['POST'])
@json_response
def causx_upload_project():
    """upload a t2wmlz or zip project file and load it as the current project"""
    #upload a project zip and load it as the active project
    project_folder = get_project_folder()
    in_file = causx_get_file([".t2wmlz", ".zip"])
    with tempfile.TemporaryDirectory() as tmpdirname:
        file_path = Path(tmpdirname) / secure_filename(Path(in_file.filename).name)
        in_file.save(str(file_path))
        with zipfile.ZipFile(file_path, mode='r', compression=zipfile.ZIP_DEFLATED) as zf:
            filemap=json.loads(zf.read("filemap.json"))
            for file in zf.namelist():
                if ".." in file or file=="filemap.json":
                    continue
                zf.extract(file, path=project_folder)

    project = get_project()
    sheet_name=filemap["sheet"]
    start_end_kwargs=get_range_params()
    calc_params=CalcParams(project, filemap["data"], sheet_name, annotation_path=filemap["annotation"], **start_end_kwargs)
    response=dict()

    response["table"] = get_table(calc_params)
    response["annotations"], response["yamlContent"] = get_annotations(calc_params)
    response["layers"] = get_qnodes_layer(calc_params)
    response["project"]=get_project_dict(project)
    response["sheetName"]=sheet_name
    response["filepath"]=filemap["data"]
    return response, 200

@app.route('/api/causx/upload/spreadsheet', methods=['POST'])
@json_response
def causx_upload_spreadsheet():
    """upload a data file, save to filesystem, add to project
    return data file path parameter and the sheet names"""
    project = get_project()
    in_file=causx_get_file([".csv", ".xlsx"])

    folder = Path(project.directory)
    shorter_name = Path(in_file.filename).name
    filename = secure_filename(shorter_name)
    file_path = folder/filename
    in_file.save(str(file_path))

    file_path = project.add_data_file(file_path)
    response =dict()
    response["data_file"]= file_path
    response["sheet_names"]=project.data_files[file_path]["val_arr"]
    return response, 200



@app.route('/api/causx/upload/annotation', methods=['POST'])
@json_response
def causx_upload_annotation():
    """upload a t2wmlz file but use it to generate an annotation for the current file
    TO DO: handle entity definitions in the t2wmlz file being copied over to current file"""
    #upload a project zip, extract the annotation file, and apply it to the current project
    project = get_project()
    in_file = causx_get_file([".t2wmlz", ".zip"])
    calc_params=get_calc_params(project)
    with tempfile.TemporaryDirectory() as tmpdirname:
        file_path = Path(tmpdirname) / secure_filename(Path(in_file.filename).name)
        in_file.save(str(file_path))
        with zipfile.ZipFile(file_path, mode='r', compression=zipfile.ZIP_DEFLATED) as zf:
            filemap=json.loads(zf.read("filemap.json"))
            source_annotations=json.loads(zf.read(filemap["annotation"]))
            data_file_name=filemap["data"]
            data_file=BytesIO(zf.read(data_file_name))

            if Path(data_file_name).suffix==".csv":
                source_df = pd.read_csv(data_file, dtype=str, header=None)
            else:
                source_df = pd.read_excel(data_file, sheet_name=filemap["sheet"], dtype=str, header=None)
            source_df.fillna("")
            source_df.replace(r'^\s+$', "", regex=True)

    try:
        processed_annotation = copy_annotation(source_annotations, source_df, calc_params.sheet.data)
    except:
        processed_annotation = []
    with open(calc_params.annotation_path, 'w') as f:
        f.write(json.dumps(processed_annotation, cls=NumpyEncoder))

    project.add_annotation_file(calc_params.annotation_path, calc_params.data_path, calc_params.sheet_name)

    country_selections=[]
    for block in processed_annotation:
        if block["role"]=="mainSubject":
            country_selections.append(block["selection"])

    for selection in country_selections:
        selection = get_tuple_selection(selection)
        cell_qnode_map, problem_cells = wikify_countries(calc_params, selection)
        project.add_df_to_wikifier_file(calc_params.sheet, cell_qnode_map)
        #auto-create nodes for anything that failed to wikify
        create_nodes_from_selection(selection, project, calc_params.sheet, calc_params.wikifier)

    calc_params = get_calc_params(project)
    response, code = get_mapping()
    response["project"]=get_project_dict(project)
    return response, code


@app.route('/api/causx/download_project', methods=['GET'])
@json_response
def causx_download_project():
    """download a .t2wmlz file with the files needed to restore current project state"""
    project = get_project()
    calc_params = get_calc_params(project)
    attachment_filename = project.title + "_" + Path(calc_params.data_path).stem +"_"+ Path(calc_params.sheet_name).stem +".t2wmlz"

    filestream=BytesIO()
    with zipfile.ZipFile(filestream, mode='w', compression=zipfile.ZIP_DEFLATED) as zf:
        for root, dirs, files in os.walk(project.directory):
            for file in files:
                zf.write(os.path.join(root, file),
                       os.path.relpath(os.path.join(root, file),
                                       project.directory))
        dir=Path(project.directory).stem
        zf.writestr("filemap.json", json.dumps(dict(data=str(Path(calc_params._data_path).as_posix()),
                                                    sheet=calc_params.sheet_name,
                                                    annotation=str(Path(calc_params._annotation_path).as_posix())
                                                        )))

    filestream.seek(0)
    return send_file(filestream, attachment_filename=attachment_filename, as_attachment=True, mimetype='application/zip'), 200


@app.route('/api/causx/partialcsv', methods=['GET'])
@json_response
def causx_partial_csv():
    """fetch partial csv
    (no type validation, attempts to fetch main subject even without variable+property)"""

    project = get_project()
    calc_params = get_calc_params(project)
    response = dict()
    response["partialCsv"] = get_causx_partial_csv(calc_params)
    return response, 200

@app.route('/api/causx/download_zip_results', methods=['GET'])
@json_response
def causx_save_zip_results():
    '''
    returns zip file containing:
    canonical.csv
    dataset-metadata.json
    variable-metadata.json
    annotation.json
    '''
    project = get_project()
    calc_params = get_calc_params(project)

    annotation_path=calc_params.annotation_path

    kg = get_kg(calc_params)

    csv_data = causx_create_canonical_spreadsheet(kg.statements, project)
    variable_data = causx_get_variable_metadata(calc_params, kg.statements)

    attachment_filename = project.title + '-' + Path(calc_params.data_path).stem + ".zip"
    filestream=BytesIO()
    with zipfile.ZipFile(filestream, mode='w', compression=zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("canonical.csv", csv_data)
        zf.writestr("dataset-metadata.json", json.dumps(dict(name=project.title,
                                                            dataset_id=project.title,
                                                            description=project.description,
                                                            url=project.url
                                                            )))
        zf.writestr("variable-metadata.json", json.dumps(variable_data))
        zf.write(annotation_path, arcname="annotation.json")

    filestream.seek(0)
    return send_file(filestream, attachment_filename=attachment_filename, as_attachment=True, mimetype='application/zip'), 200

@app.route('/api/causx/entity/<id>', methods=['GET'])
@json_response
def causx_get_an_entity(id):
    """get ane entity by its ID including tags"""
    project = get_project()
    entities_dict=causx_get_variable_dict(project)
    entity=entities_dict.get(id, None)
    if entity:
        entity["tags"]=include_base_causx_tags(entity.get("tags", {}))
        entity['id'] = id
        return dict(entity=entity), 200
    else:
        return {}, 404

@app.route('/api/causx/entity/<id>', methods=['PUT'])
@json_response
def causx_edit_an_entity(id):
    """edit an entity including editing tags"""
    project = get_project()
    updated_entry = request.get_json()["updated_entry"]
    entity = causx_set_variable(project, id, updated_entry)
    response=dict(entity=entity)
    calc_params = get_calc_params(project, data_required=False)
    if calc_params:
        response["layers"] = get_qnodes_layer(calc_params)
    return response, 200



@app.route('/api/causx/project/download/<filetype>', methods=['GET'])
def download_results_for_causx(filetype):
    """
    return as attachment
    """
    mimetype_dict = {
        "tsv": "text/tab-separated-values",
        "csv": "text/csv",
        "json": "application/json"
    }
    project = get_project()
    calc_params = get_calc_params(project)
    annotation_path = calc_params.annotation_path
    kg = get_kg(calc_params)
    data = kg.get_output(filetype, calc_params.project)
    stream = BytesIO(data.encode('utf-8'))
    stream.seek(0)
    attachment_filename = request.args.get('data_file')
    return send_file(stream, attachment_filename=attachment_filename, as_attachment=True, mimetype=mimetype_dict[filetype]), 200


@app.route('/api/causx/project/fidil_json', methods=['GET'])
def download_fidil_json():
    project = get_project()
    calc_params = get_calc_params(project)
    data = json.dumps(create_fidil_json(calc_params))
    stream = BytesIO(data.encode('utf-8'))
    stream.seek(0)
    filename = request.args.get('data_file')
    return send_file(stream, attachment_filename=filename, as_attachment=True, mimetype="application/json"), 200

@app.route('/api/causx/project/upload_fidil_json/', methods=['PUT'])
def upload_fidil():
    project = get_project()
    calc_params = get_calc_params(project)
    status_code = upload_fidil_json(calc_params)
    return {}, status_code


###################end of section##############################


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
