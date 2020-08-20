import requests
import tempfile
from pathlib import Path
from t2wml.api import Sheet
from models import ItemsFile
from t2wml_web import download
from app_config import DATAMART_API_ENDPOINT
from web_exceptions import NoSuchDatasetIDException, CellResolutionWithoutYAMLFileException


def get_dataset_id(data_sheet):
    # step one: extract dataset id from cell B1
    try:
        sheet = Sheet(data_sheet.data_file.file_path, data_sheet.name)
        data_cell = str(sheet[0, 1])
    except:
        raise ValueError("Could not get dataset id from sheet")
    # step two: check if dataset id exists
    response = requests.get(DATAMART_API_ENDPOINT + "/metadata/datasets/{dataset_id}".format(dataset_id=data_cell))
    if response.status_code != 200:
        raise ValueError("Dataset ID not found in datamart")

    return data_cell


def get_download(project, sheet):
    yaml_file = sheet.yaml_file
    if not yaml_file:
        raise CellResolutionWithoutYAMLFileException(
            "Cannot download report without uploading YAML file first")
    response = download(sheet, yaml_file, project, "tsv")
    kgtk = response["data"]
    return kgtk


def upload_to_datamart(project, data_sheet):
    # get the dataset id
    try:
        dataset_id = get_dataset_id(data_sheet)
    except Exception as e:
        raise NoSuchDatasetIDException(str(e))

    # get the download kgtk
    kgtk = get_download(project, data_sheet)

    # get the item file
    item_file = ItemsFile.query.filter_by(
        project_id=project.id).order_by(ItemsFile.id.desc()).first()

    with tempfile.TemporaryFile(suffix=".tsv") as tmpfile:
        tmpfile.write(kgtk.encode("utf-8"))
        tmpfile.seek(0)

        # upload to datamart
        files = {
            'item_definitions': ('item_definitions.tsv', open(item_file.file_path), 'application/octet-stream'),
            'kgtk_output': ('kgt_output.tsv', tmpfile, 'application/octet-stream')
        }

        response = requests.put(f'{DATAMART_API_ENDPOINT}/datasets/{dataset_id}/t2wml', files=files)
        variable_ids = [x['variable_id'] for x in response.json()]
        url_param = '?'
        for variable_id in variable_ids:
            url_param += f'variable={variable_id}&'
        get_url = f'{DATAMART_API_ENDPOINT}/datasets/{dataset_id}/variables{url_param[:-1]}'
        print(get_url)

    data = {'datamart_get_url': get_url}
    return data
