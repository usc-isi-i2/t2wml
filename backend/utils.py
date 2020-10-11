import os
import csv
import json
import pandas as pd
from t2wml.spreadsheets.conversions import column_index_to_letter
from pathlib import Path
from string import punctuation
from flask import request
import web_exceptions



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
