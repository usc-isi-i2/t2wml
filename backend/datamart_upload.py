import os
import requests
from pathlib import Path
import tempfile

from t2wml.api import Sheet
from web_exceptions import NoSuchDatasetIDException, CellResolutionWithoutYAMLFileException
from app_config import DATAMART_API_ENDPOINT
from t2wml_web import download
from models import ItemsFile

def get_dataset_id(data_sheet):
    #step one: extract dataset id from cell B1
    try:
        sheet = Sheet(data_sheet.data_file.file_path, data_sheet.name)
        data_cell=str(sheet[0, 1])
    except:
        raise ValueError("Could not get dataset id from sheet")
    #step two: check if dataset id exists
    response=requests.get(DATAMART_API_ENDPOINT+"/metadata/datasets/{dataset_id}".format(dataset_id=data_cell))
    if response.status_code!=200:
        raise ValueError("Dataset ID not found in datamart")
    
    return data_cell

def get_download(project, sheet):
    yaml_file = sheet.yaml_file
    if not yaml_file:  
        raise CellResolutionWithoutYAMLFileException(
            "Cannot download report without uploading YAML file first")
    response=download(sheet, yaml_file, project, "tsv")
    kgtk=response["data"]
    return kgtk

def get_concatenated_file(project, kgtk, tempfile):
    tempfile.write(kgtk.encode('utf-8'))

    #open the item file, slice off the header row
    item_file = ItemsFile.query.filter_by(
            project_id=project.id).order_by(ItemsFile.id.desc()).first()
    
    with open(item_file.file_path, 'rb') as f:
        f.readline()
        data=f.read()
        
    tempfile.write(data)

    
    



def upload_to_datamart(project, data_sheet):
    try:
        dataset_id = get_dataset_id(data_sheet)
    except Exception as e:
        raise NoSuchDatasetIDException(str(e))

    #step three: get the download kgtk
    kgtk=get_download(project, data_sheet)

    with tempfile.TemporaryFile(mode="r+b", suffix=".tsv") as tmpfile:
        #step four: concatenate download with item defs file
        concatenated=get_concatenated_file(project, kgtk, tmpfile)

        #step five: upload to datamart
        files = {
            'file': (Path(tmpfile.name).name, tmpfile, 'application/octet-stream')
        }
        response=requests.put(DATAMART_API_ENDPOINT + "/datasets/{dataset_id}/t2wml".format(dataset_id=dataset_id),
                            files=files)

    data={}
    return data


