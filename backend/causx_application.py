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
from werkzeug.utils import secure_filename
from app_config import app
from t2wml.project import Project, FileNotPresentInProject, InvalidProjectDirectory
from t2wml.wikification.utility_functions import dict_to_kgtk, kgtk_to_dict
from t2wml.api import annotation_suggester, get_Pnode, get_Qnode, t2wml_settings
from t2wml_web import ( get_kg, autocreate_items, set_web_settings,
                        get_layers, get_annotations, get_table, save_annotations,
                       get_project_instance, get_qnodes_layer,
                       suggest_annotations,  update_t2wml_settings, get_entities)
import web_exceptions
from causx.causx_utils import AnnotationNodeGenerator, causx_get_variable_dict, causx_get_variable_metadata, causx_set_variable, get_causx_partial_csv, causx_create_canonical_spreadsheet, get_causx_tags, preload
from causx.wikification import wikify_countries
from utils import create_user_wikification
from web_exceptions import WebException, make_frontend_err_dict
from calc_params import CalcParams
from global_settings import global_settings



debug_mode = False

set_web_settings()

os.makedirs(app.config["PROJECTS_DIR"], exist_ok=True)

def encode_auth_token():
    """
    Generates the Auth Token
    :return: string
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
    payload = jwt.decode(auth_token, app.config.get('SECRET_KEY'), algorithms=['HS256'])
    return payload['sub']


def get_project_folder():
    auth_header=request.headers.get("Authentication")
    request_folder=decode_auth_token(auth_header)
    base_dir=app.config["PROJECTS_DIR"]
    project_folder= Path(base_dir) / request_folder
    os.makedirs(project_folder, exist_ok=True)
    return project_folder


def get_project():
    project_folder = get_project_folder()
    try:
        Project.load(project_folder)
    except FileNotPresentInProject:
        p=Project(project_folder, title="Causx")
        p.save()

    project = get_project_instance(project_folder)
    return project


def get_project_dict(project):
    return_dict = {}
    return_dict.update(project.__dict__)
    return_dict.update(global_settings.__dict__)
    return return_dict


def json_response(func):
    def wrapper(*args, **kwargs):
        #new_cookie=None
        #if not request.cookies.get("user-id"):
        #    request.cookies=dict(request.cookies)
        #    new_cookie=str(uuid.uuid4())
        #    request.cookies["user-id"]=new_cookie
        try:
            data, code = func(*args, **kwargs)
        except WebException as e:
            data = {"error": e.error_dict}
            code = e.code
        except Exception as e:
            #print(e)
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
            #if new_cookie:
            #    response.set_cookie("user-id", new_cookie)
            return response, code

    wrapper.__name__ = func.__name__  # This is required to avoid issues with flask
    return wrapper

def get_annotation_name(calc_params):
    data_file=calc_params.data_path
    sheet_name=calc_params.sheet_name
    annotation_path = "annotations/" + Path(data_file).stem + "_" + Path(sheet_name).stem + ".annotation"
    os.makedirs(Path(calc_params.project.directory)/"annotations", exist_ok=True)
    return annotation_path

def get_calc_params(project, data_required=True):
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

    calc_params = CalcParams(project, data_file, sheet_name)

    calc_params._annotation_path = get_annotation_name(calc_params)

    return calc_params


def get_mapping():
    project = get_project()
    calc_params = get_calc_params(project)
    response = dict(project=get_project_dict(project))
    response["annotations"], response["yamlContent"] = get_annotations(
            calc_params)
    try:
        preload(calc_params)
    except Exception as e:
        pass
    get_layers(response, calc_params)
    return response, 200

@app.route('/api/causx/token', methods=['GET'])
def get_token():
    return {"token": encode_auth_token()}, 200


@app.route('/api/causx/project/entities', methods=['GET']) #V
@json_response
def get_project_entities():
    project = get_project()
    response = get_entities(project)
    return response, 200


@app.route('/api/causx/auto_wikinodes', methods=['POST'])
@json_response
def create_auto_nodes():
    """
    This function calls the wikifier service to wikifiy a region, and deletes/updates wiki region file's results
    :return:
    """
    project = get_project()
    calc_params = get_calc_params(project)
    selection = request.get_json()['selection']
    selection = (selection["x1"]-1, selection["y1"] -
                 1), (selection["x2"]-1, selection["y2"]-1)
    is_property = request.get_json()['is_property']
    data_type = request.get_json().get("data_type", None)
    autocreate_items(calc_params, selection, is_property, data_type)
    response = dict(project=get_project_dict(project))
    response["layers"] = get_qnodes_layer(calc_params)
    return response, 200


@app.route('/api/causx/annotation', methods=['POST'])
@json_response
def upload_annotation():
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
def suggest_annotation_block():
    project = get_project()
    calc_params = get_calc_params(project)
    block = request.get_json()["selection"]
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
def guess_annotation_blocks():
    project = get_project()
    calc_params = get_calc_params(project)
    suggest_annotations(calc_params)
    return get_mapping()


@app.route('/api/causx/project/settings', methods=['PUT', 'GET']) #V
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


@app.route('/api/causx/delete_wikification', methods=['POST'])
@json_response
def delete_wikification():
    project = get_project()
    calc_params = get_calc_params(project)
    sheet_name = calc_params.sheet.name
    data_file_name = calc_params.sheet.data_file_name

    selection = request.get_json()['selection']
    if not selection:
        raise web_exceptions.InvalidRequestException('No selection provided')


    value = request.get_json().get('value', None)
    #context = request.get_json().get("context", "")


    top_left, bottom_right = selection
    col1, row1 = top_left
    col2, row2 = bottom_right

    filepath, exists=project.get_wikifier_file(calc_params.data_path)
    if exists:
        df=pd.read_csv(filepath)
        for col in range(col1, col2+1):
            for row in range(row1, row2+1):
                if value:
                    df = df.drop(df[(df['column'] == col)
                                    & (df['row'] == row)
                                    & (df['value'] == value)
                                    & (df['file'] == data_file_name)
                                    & (df['sheet'] == sheet_name)].index)
                else:
                    df = df.drop(df[(df['column'] == col)
                                    & (df['row'] == row)
                                    & (df['file'] == data_file_name)
                                    & (df['sheet'] == sheet_name)].index)
        df.to_csv(filepath, index=False, header=True)

    response = dict(project=get_project_dict(project))
    response["layers"] = get_qnodes_layer(calc_params)

    return response, 200


@app.route('/api/causx/create_node', methods=['POST'])
@json_response
def create_qnode():
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
def causx_wikify():
    project = get_project()
    region = request.get_json()["selection"]
    overwrite_existing = request.get_json().get("overwrite", False)
    #context = request.get_json()["context"]
    calc_params = get_calc_params(project)

    cell_qnode_map, problem_cells = wikify_countries(calc_params, region)
    project.add_df_to_wikifier_file(calc_params.data_path, cell_qnode_map, overwrite_existing)

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
    calc_params = CalcParams(project, file_path, sheet_name)
    response["table"] = get_table(calc_params)
    project.title=Path(file_path).stem
    project.save()
    response.update(dict(project=get_project_dict(project), filepath=file_path))
    return response, code

@app.route('/api/causx/upload/project', methods=['POST'])
@json_response
def causx_upload_project():
    #upload a project zip and load it as the active project
    project = get_project()
    in_file = causx_get_file([".t2wmlz"])

    with tempfile.TemporaryDirectory() as tmpdirname:
        file_path = Path(tmpdirname) / secure_filename(Path(in_file.filename).name)
        in_file.save(str(file_path))
        with zipfile.ZipFile(file_path, mode='r', compression=zipfile.ZIP_DEFLATED) as zf:
            filemap=json.loads(zf.read("filemap.json"))
            for file in zf.namelist():
                if ".." in file:
                    continue
                if file.startswith(filemap["dir"]):
                    zf.extract(file, path=project.directory)


    sheet_name=filemap["sheet"]
    calc_params=CalcParams(project, filemap["data"], sheet_name, annotation_path=filemap["annotation"])
    response=dict()
    response["table"] = get_table(calc_params)
    response["annotations"], response["yamlContent"] = get_annotations(calc_params)
    response["layers"] = get_qnodes_layer(calc_params)
    response["project"]=get_project_dict(project)
    response["sheetName"]=sheet_name
    response["filepath"]=filemap["data"]
    return response, 200

def process_annotation(calc_params, source_annotations, source_df):
    return source_annotations


@app.route('/api/causx/upload/annotation', methods=['POST'])
@json_response
def causx_upload_annotation():
    #upload a project zip, extract the annotation file, and apply it to the current project
    project = get_project()
    in_file = causx_get_file([".t2wmlz"])
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
                source_df = pd.read_csv(data_file)
            else:
                source_df = pd.read_excel(data_file, sheet_name=filemap["sheet"])

    processed_annotation=process_annotation(calc_params, source_annotations, source_df)
    with open(calc_params.annotation_path, 'w') as f:
        f.write(json.dumps(processed_annotation))

    project.add_annotation_file(calc_params.annotation_path, calc_params.data_path, calc_params.sheet_name)
    preload(calc_params)
    response, code = get_mapping()
    response["project"]=get_project_dict(project)
    return response, code


@app.route('/api/causx/download_project', methods=['GET'])
@json_response
def causx_download_project():
    #download a .t2wmlz file with the files needed to restore current project state
    project = get_project()
    calc_params = get_calc_params(project)
    attachment_filename = project.title + "_" + Path(calc_params.data_path).stem +"_"+ Path(calc_params.sheet_name).stem +".t2wmlz"

    filestream=BytesIO()
    with zipfile.ZipFile(filestream, mode='w', compression=zipfile.ZIP_DEFLATED) as zf:
        for root, dirs, files in os.walk(project.directory):
            for file in files:
                zf.write(os.path.join(root, file),
                       os.path.relpath(os.path.join(root, file),
                                       os.path.join(project.directory, '..')))
        dir=Path(project.directory).stem
        zf.writestr("filemap.json", json.dumps(dict(dir=Path(project.directory).stem,
                                                        data=str((Path(dir)/calc_params._data_path).as_posix()),
                                                        sheet=calc_params.sheet_name,
                                                        annotation=str((Path(dir)/calc_params._annotation_path).as_posix())
                                                        )))

    filestream.seek(0)
    return send_file(filestream, attachment_filename=attachment_filename, as_attachment=True, mimetype='application/zip'), 200


@app.route('/api/causx/partialcsv', methods=['GET'])
@json_response
def causx_partial_csv():
    project = get_project()
    calc_params = get_calc_params(project)
    response = dict()
    response["partialCsv"] = get_causx_partial_csv(calc_params)
    return response, 200

@app.route('/api/causx/download_zip_results', methods=['GET'])
@json_response
def causx_save_zip_results():
    '''
    returns:
    canonical.csv
    dataset-metadata.json
    variable-metadata.json
    annotation.json
    '''
    project = get_project()
    calc_params = get_calc_params(project)

    annotation_path=calc_params.annotation_path
    preload(calc_params)

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
    project = get_project()
    entities_dict=causx_get_variable_dict(project)
    entity=entities_dict.get(id, None)
    if entity:
        entity["tags"]=get_causx_tags(entity.get("tags", {}))
        entity['id'] = id
        return dict(entity=entity), 200
    else:
        return {}, 404

@app.route('/api/causx/entity/<id>', methods=['PUT'])
@json_response
def causx_edit_an_entity(id):
    project = get_project()
    updated_entry = request.get_json()["updated_entry"]
    entity = causx_set_variable(project, id, updated_entry)
    response=dict(entity=entity)
    calc_params = get_calc_params(project, data_required=False)
    if calc_params:
        response["layers"] = get_qnodes_layer(calc_params)
    return response, 200



@app.route('/api/causx/project/download/<filetype>/<filename>', methods=['GET'])
def download_results(filetype, filename):
    """
    return as attachment
    """
    mimetype_dict = {
        "tsv": "text/tab-separated-values",
        "csv": "text/csv",
        "json": "application/json"
    }
    attachment_filename = filename
    project = get_project()
    calc_params = get_calc_params(project)
    annotation_path = calc_params.annotation_path
    ang = AnnotationNodeGenerator.load_from_path(annotation_path, project)
    ang.preload(calc_params.sheet, calc_params.wikifier)
    kg = get_kg(calc_params)
    data = kg.get_output(filetype, calc_params.project)
    stream = BytesIO(data.encode('utf-8'))
    stream.seek(0)
    return send_file(stream, attachment_filename=attachment_filename, as_attachment=True, mimetype=mimetype_dict[filetype]), 200

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
