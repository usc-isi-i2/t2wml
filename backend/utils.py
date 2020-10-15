import os
import csv
import json
import pandas as pd
from t2wml.spreadsheets.conversions import column_index_to_letter
from pathlib import Path
from string import punctuation
from flask import request
from SPARQLWrapper import SPARQLWrapper, JSON
import web_exceptions
from wikidata_models import WikidataEntity

wikidata_label_query_cache = {}

def query_wikidata_for_label_and_description(items, sparql_endpoint):
    items = ' wd:'.join(items)
    items = "wd:" + items

    query = """SELECT ?qnode ?qnodeLabel ?qnodeDescription WHERE 
            {{
            VALUES ?qnode {{{items}}}
            SERVICE wikibase:label {{ bd:serviceParam wikibase:language "[AUTO_LANGUAGE],en". }}
            }}
            """.format(items=items)
    sparql = SPARQLWrapper(sparql_endpoint)
    sparql.setQuery(query)
    sparql.setReturnFormat(JSON)
    try:
        results = sparql.query().convert()
    except Exception as e:
        raise e
    response = dict()
    for i in range(len(results["results"]["bindings"])):
        try:
            qnode = results["results"]["bindings"][i]["qnode"]["value"].split(
                "/")[-1]
            label = results["results"]["bindings"][i]["qnodeLabel"]["value"]
            desc = results["results"]["bindings"][i]["qnodeDescription"]["value"]
            response[qnode] = {'label': label, 'description': desc}
        except (IndexError, KeyError):
            pass
    return response


def get_labels_and_descriptions(items, sparql_endpoint):
    response = dict()
    missing_items = []
    for item in items:
        wp = WikidataEntity.query.filter_by(wd_id=item).first()
        if wp:
            label = desc = ""
            if wp.label:
                label = wp.label
                if wp.description:
                    desc = wp.description
                response[item] = dict(label=label, description=desc)
            else:
                missing_items.append(item)
        else:
            missing_items.append(item)
    try:
        if missing_items:
            additional_items = query_wikidata_for_label_and_description(
                missing_items, sparql_endpoint)
            response.update(additional_items)
            try:
                for item in additional_items:
                    WikidataEntity.add_or_update(item, do_session_commit=False, **additional_items[item])
            except Exception as e:
                print(e)
            WikidataEntity.do_commit()

    except:  # eg 502 bad gateway error
        pass
    return response


def make_frontend_err_dict(error):
    '''
    convenience function to convert all errors to frontend readable ones
    '''
    return {
        "errorCode": 500,
        "errorTitle": "Undefined Backend Error",
        "errorDescription": str(error)
    }


def string_is_valid(text: str) -> bool:
    def check_special_characters(text: str) -> bool:
        return all(char in punctuation for char in str(text))

    if text is None or check_special_characters(text):
        return False
    text = text.strip().lower()
    if text in ["", "#na", "nan"]:
        return False
    return True


def file_upload_validator(file_extensions):
    if 'file' not in request.files:
        raise web_exceptions.NoFilePartException(
            "Missing 'file' parameter in the file upload request")

    in_file = request.files['file']
    if in_file.filename == '':
        raise web_exceptions.BlankFileNameException(
            "No file selected for uploading")

    file_extension = in_file.filename.split(".")[-1].lower()
    file_allowed = file_extension in file_extensions
    if not file_allowed:
        raise web_exceptions.FileTypeNotSupportedException(
            "File with extension '" + file_extension + "' is not allowed")

    return in_file


def table_data(calc_params):
    sheet_names = calc_params.sheet_names
    sheet_name = calc_params.sheet_name
    data_path = Path(calc_params.data_path)
    is_csv = True if data_path.suffix.lower() == ".csv" else False
    sheetData = sheet_to_json(calc_params)
    return {
        "filename": data_path.name,
        "isCSV": is_csv,
        "sheetNames": sheet_names,
        "currSheetName": sheet_name,
        "sheetData": sheetData
    }


def sheet_to_json(calc_params):
    sheet = calc_params.sheet
    data = sheet.data.copy()
    json_data = {'columnDefs': [{'headerName': "", 'field': "^", 'pinned': "left"}],
                 'rowData': []}
    # get col names
    col_names = []
    for i in range(len(sheet.data.iloc[0])):
        column = column_index_to_letter(i)
        col_names.append(column)
        json_data['columnDefs'].append({'headerName': column, 'field': column})
    # rename cols
    data.columns = col_names
    # rename rows
    data.index += 1
    # get json
    json_string = data.to_json(orient='table')
    json_dict = json.loads(json_string)
    initial_json = json_dict['data']
    # add the ^ column
    for i, row in enumerate(initial_json):
        row["^"] = str(i + 1)
    # add to the response
    json_data['rowData'] = initial_json
    return json_data


def save_file(project_folder, in_file):
    folder = project_folder
    filename = Path(in_file.filename).name  # otherwise secure_filename does weird things on linux
    file_path = Path(folder) / filename
    in_file.save(str(file_path))
    return file_path


def save_dataframe(project, df, file_name, kgtk=False):
    # entities and wikifiers
    folder = project.directory
    filepath = str(Path(folder) / file_name)
    if kgtk:
        df.to_csv(filepath, sep='\t', index=False, quoting=csv.QUOTE_NONE)
    else:
        df.to_csv(filepath, index=False)
    return filepath


def save_yaml(project, yaml_data, yaml_title=None):
    sheet_name = project.current_sheet  # TODO: FIX
    if not yaml_title:
        yaml_title = sheet_name + ".yaml"

    file_path = Path(project.directory) / yaml_title
    with open(file_path, 'w', newline='', encoding="utf-8") as f:
        f.write(yaml_data)

    project.add_yaml_file(file_path, project.current_data_file, sheet_name)
    project.update_saved_state(current_yaml=file_path)
    project.save()

