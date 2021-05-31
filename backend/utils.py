import csv
from pathlib import Path
import numpy as np
from string import punctuation
from flask import request
import os
import pandas as pd

import web_exceptions


def numpy_converter(o):
    if isinstance(o, np.generic):
        return o.item()
    raise TypeError


def get_yaml_content(calc_params):
    yaml_path = calc_params.yaml_path
    if yaml_path:
        with open(yaml_path, "r", encoding="utf-8") as f:
            yamlFileContent = f.read()
        return yamlFileContent
    return None


def file_upload_validator(file_extensions):
    if 'filepath' not in request.get_json():
        raise web_exceptions.NoFilePartException(
            "Missing 'filepath' parameter in the file upload request")

    filepath = request.get_json()["filepath"]
    if filepath == '':
        raise web_exceptions.BlankfilepathException(
            "No file selected for uploading")

    file_extension = Path(filepath).suffix.lower()
    file_allowed = file_extension in file_extensions
    if not file_allowed:
        raise web_exceptions.FileTypeNotSupportedException(
            "File with extension '" + file_extension + "' is not allowed")

    return filepath


def save_dataframe(project, df, file_name, kgtk=False):
    # entities and wikifiers
    folder = project.directory
    filepath = str(Path(folder) / file_name)
    if kgtk:
        df.to_csv(filepath, sep='\t', index=False, quoting=csv.QUOTE_NONE)
    else:
        df.to_csv(filepath, index=False)
    return filepath


def save_yaml(project, yaml_data, data_file, sheet_name, yaml_title=None):
    if not yaml_title:
        yaml_title = sheet_name + ".yaml"

    file_path = Path(project.directory) / yaml_title
    with open(file_path, 'w', newline='', encoding="utf-8") as f:
        f.write(yaml_data)

    filename = project.add_yaml_file(file_path, data_file, sheet_name)
    project.save()
    return filename


def get_empty_layers():
    errorLayer = dict(layerType="error", entries=[])
    statementLayer = dict(layerType="statement", entries=[], qnodes={})
    cleanedLayer = dict(layerType="cleaned", entries=[])
    typeLayer = dict(layerType="type", entries=[])
    qnodeLayer = dict(layerType="qnode", entries=[])

    return dict(error=errorLayer,
                statement=statementLayer,
                cleaned=cleanedLayer,
                type=typeLayer,
                qnode=qnodeLayer)


def create_user_wikification(calc_params, project, selection, value, context, item):
    top_left, bottom_right = selection
    col1, row1 = top_left
    col2, row2 = bottom_right
    sheet_name = calc_params.sheet.name
    data_file_name = calc_params.sheet.data_file_name
    df_rows = []
    for col in range(col1, col2+1):
        for row in range(row1, row2+1):
            df_rows.append([col, row, value, context, item,
                            data_file_name, sheet_name])
    df = pd.DataFrame(df_rows, columns=[
                      "column", "row", "value", "context", "item", "file", "sheet"])
    filepath = os.path.join(project.directory, "user-input-wikification.csv")
    create_wikifier_file(project, df, filepath)

def create_wikifier_file(project, df, filepath, precedence=True):
    if os.path.exists(filepath):
        #clear any clashes/duplicates
        org_df=pd.read_csv(filepath)
        if 'file' not in org_df:
            org_df['file']=''
        if 'sheet' not in org_df:
            org_df['sheet']=''

        df=pd.concat([org_df, df]).drop_duplicates(subset=['row', 'column', 'value', 'file', 'sheet'], keep='last').reset_index(drop=True)

    df.to_csv(filepath, index=False, header=True)

    project.add_wikifier_file(filepath, precedence=precedence)
    project.save()
