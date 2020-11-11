import csv
from pathlib import Path
import numpy as np
from string import punctuation
from flask import request

import web_exceptions


def numpy_converter(o):
    if isinstance(o, np.generic): return o.item()  
    raise TypeError


def get_yaml_content(calc_params):
    yaml_path = calc_params.yaml_path
    if yaml_path:
        with open(yaml_path, "r", encoding="utf-8") as f:
            yamlFileContent = f.read()
        return yamlFileContent
    return None


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


def get_empty_layers():
    errorLayer=dict(layerType="error", entries=[])
    statementLayer=dict(layerType="statement", entries=[], qnodes={})
    cleanedLayer=dict(layerType="cleaned", entries=[])
    typeLayer=dict(layerType="type", entries=[])
    qnodeLayer=dict(layerType="qnode", entries=[])
    annotationLayer=dict(layerType="annotation", entries=[])

    return dict(error= errorLayer, 
            statement= statementLayer, 
            cleaned= cleanedLayer, 
            type = typeLayer,
            qnode=qnodeLayer,
            annotation = annotationLayer)

