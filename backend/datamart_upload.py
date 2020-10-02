import requests
import tempfile
from pathlib import Path
from t2wml.api import Sheet
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


def get_download(calc_params):
    response = download(calc_params, "tsv")
    kgtk = response["data"]
    return kgtk

def get_item_file(calc_params):
    #TODO
    pass


def upload_to_datamart(data_sheet, calc_params):
    # get the dataset id
    try:
        dataset_id = get_dataset_id(data_sheet)
    except Exception as e:
        raise NoSuchDatasetIDException(str(e))

    # get the download kgtk
    kgtk = get_download(calc_params)

    # get the item file
    item_file_path = get_item_file(calc_params)

    with tempfile.TemporaryFile(suffix=".tsv") as tmpfile:
        tmpfile.write(kgtk.encode("utf-8"))
        tmpfile.seek(0)

        # upload to datamart
        files = {
            'item_definitions': ('item_definitions.tsv', open(item_file_path), 'application/octet-stream'),
            'kgtk_output': ('kgt_output.tsv', tmpfile, 'application/octet-stream')
        }

        response = requests.put(f'{DATAMART_API_ENDPOINT}/datasets/{dataset_id}/t2wml', files=files)

        if response.status_code == 201:
            variable_ids = []
            for x in response.json():
                if 'variable_id' in x:
                    variable_ids.append(x['variable_id'])
                else:
                    print('Problem variable:', x)
            if variable_ids:
                url_param = '?'
                for variable_id in variable_ids:
                    url_param += f'variable={variable_id}&'
                get_url = f'{DATAMART_API_ENDPOINT}/datasets/{dataset_id}/variables{url_param[:-1]}'
                print(get_url)
                data = {'datamart_get_url': get_url}
            else:
                data = {'description': 'No variables defined'}
        else:
            data = {'description': response.text}

    return data
