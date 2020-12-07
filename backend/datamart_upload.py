import os
import requests
import tempfile
from pathlib import Path
from t2wml_web import download
from web_exceptions import NoSuchDatasetIDException, CellResolutionWithoutYAMLFileException
from global_settings import datamart_api_endpoint



def get_dataset_id(sheet):
    # step one: extract dataset id from cell B1
    try:
        data_cell = str(sheet[0, 1])
    except:
        raise ValueError("Could not get dataset id from sheet")
    # step two: check if dataset id exists
    response = requests.get(datamart_api_endpoint() + "/metadata/datasets/{dataset_id}".format(dataset_id=data_cell))
    if response.status_code != 200:
        raise NoSuchDatasetIDException(data_cell)

    return data_cell


def get_download(calc_params):
    response = download(calc_params, "tsv")
    kgtk = response["data"]
    return kgtk


def get_item_definitions_filepath(calc_params):
    item_files = calc_params.project.entity_files  # a list of filepaths (to tsv files)p
    # TODO: we only want the item definitions, not the Wikidata or preexisting properties

    if 'datamart_item_definitions.tsv' in item_files:
        return os.path.join(calc_params.project.directory, 'datamart_item_definitions.tsv')
    return None


def upload_to_datamart(calc_params):
    # get the dataset id
    dataset_id = get_dataset_id(calc_params.sheet)
        

    # get the download kgtk
    kgtk = get_download(calc_params)

    # get the item file
    item_file_path = get_item_definitions_filepath(calc_params)
    if not item_file_path:
        raise Exception('Item File Path not found!!')
    with tempfile.TemporaryFile(suffix=".tsv") as tmpfile:
        tmpfile.write(kgtk.encode("utf-8"))
        tmpfile.seek(0)

        # upload to datamart
        files = {
            'item_definitions': ('item_definitions.tsv', open(item_file_path), 'application/octet-stream'),
            'kgtk_output': ('kgt_output.tsv', tmpfile, 'application/octet-stream')
        }

        response = requests.put(f'{datamart_api_endpoint()}/datasets/{dataset_id}/t2wml', files=files)

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
                get_url = f'{datamart_api_endpoint()}/datasets/{dataset_id}/variables{url_param[:-1]}'
                data = {'datamart_get_url': get_url}
            else:
                data = {'description': 'No variables defined'}
        else:
            data = {'description': response.text}

    return data
