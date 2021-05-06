import csv
from pathlib import Path
import numpy as np
import logging
from flask import request

import web_exceptions


def numpy_converter(o):
    if isinstance(o, np.generic):
        return o.item()
    raise TypeError


def get_yaml_content(calc_params):
    logging.debug("enter utils get_yaml_content")
    yaml_path = calc_params.yaml_path
    if yaml_path:
        with open(yaml_path, "r", encoding="utf-8") as f:
            yamlFileContent = f.read()
        logging.debug("return utils get_yaml_content")
        return yamlFileContent
    logging.debug("return utils get_yaml_content")
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
    logging.debug("enter utils save dataframe")
    # entities and wikifiers
    folder = project.directory
    filepath = str(Path(folder) / file_name)
    if kgtk:
        df.to_csv(filepath, sep='\t', index=False, quoting=csv.QUOTE_NONE)
    else:
        df.to_csv(filepath, index=False)
    logging.debug("return utils save dataframe")
    return filepath


def save_yaml(project, yaml_data, data_file, sheet_name, yaml_title=None):
    logging.debug("enter utils save yaml")
    if not yaml_title:
        yaml_title = sheet_name + ".yaml"

    file_path = Path(project.directory) / yaml_title
    with open(file_path, 'w', newline='', encoding="utf-8") as f:
        f.write(yaml_data)

    filename = project.add_yaml_file(file_path, data_file, sheet_name)
    project.save()
    logging.debug("return utils save yaml")
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
