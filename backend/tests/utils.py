import os
import pytest
import json
from pathlib import Path
from uuid import uuid4
from application import app

BACKEND_DIR = os.path.abspath(os.path.dirname(os.path.dirname(__file__)))

@pytest.fixture(scope="session")
def client(request):
    with app.test_client() as client:
        yield client

class BaseClass:
    results_dict={} #used if we need to overwrite the existing results when something changes
    expected_results_path=""

    @property
    def expected_results_dict(self):
        try:
            return self.e_results_dict
        except AttributeError:
            with open(self.expected_results_path, 'r', encoding="utf-8") as f:
                expected_results_dict=json.load(f)
            self.e_results_dict=expected_results_dict
            return self.e_results_dict

    def recurse_lists_and_dicts(self, input1, input2):
        if isinstance(input1, dict):
            assert input1.keys()==input2.keys()
            for key in input1:
                self.recurse_lists_and_dicts(input1[key], input2[key])

        elif isinstance(input1, list):
            assert len(input1)==len(input2)
            for index, thing in enumerate(input1):
                self.recurse_lists_and_dicts(input1[index], input2[index])

        assert input1==input2

    def compare_jsons(self, data, expected_key):
        expected_data=self.expected_results_dict[expected_key]
        assert data.keys()==expected_data.keys()
        for key in data:
            try:
                assert data[key]==expected_data[key]
            except AssertionError as e:
                self.recurse_lists_and_dicts(data[key], expected_data[key])


def sanitize_highlight_region(dict_1, dict_2):
    set_keys=[]
    for key in dict_1:
        if "list" in dict_1[key]:
            set_keys.append(key)
            test1=set(dict_1[key]["list"])
            test2=set(dict_2[key]["list"])
            assert test1==test2
    for key in set_keys:
        dict_1.pop(key, None)
        dict_2.pop(key, None)
    return set_keys


def create_project(client):
    path=os.path.join(os.path.dirname(__file__), "project_dirs", str(uuid4()))
    os.makedirs(path)
    url = '/api/project?project_folder={project_folder}'.format(project_folder=path)
    response=client.post(url,
        json=dict(
            title="test",
            description="",
            url=""
        )
    )
    assert response.status_code==201
    data = response.data.decode("utf-8")
    data = json.loads(data)
    return path

def load_data_file(client, project_folder, filename):
    url = '/api/data?project_folder={project_folder}'.format(project_folder=project_folder)
    response=client.post(url,
                json=dict(
                filepath=filename
                )
            )
    return response

def load_yaml_file(client, project_folder, filename, data_file, sheet_name):
    url=url_builder('/api/yaml/apply', project_folder, data_file, sheet_name)
    title=Path(filename).name
    with open(filename, 'r', encoding="utf-8") as f:
        yaml=f.read()
    response=client.post(url,
            json=dict(
            yaml=yaml,
            title=title
            )
        )
    return response

def load_wikifier_file(client, project_folder, filename, data_file=None, sheet_name=None):
    url=url_builder('/api/wikifier', project_folder, data_file, sheet_name)
    response=client.post(url,
            json=dict(
            filepath=filename
            )
        )
    return response

def load_item_file(client, project_folder, filename, data_file=None, sheet_name=None):
    url=url_builder('/api/project/entities', project_folder, data_file, sheet_name)
    response=client.post(url,
            json=dict(
            filepath=filename
            )
        )
    return response

def get_yaml_calculation(client, project_folder, data_file, sheet_name, yaml_file=None):
    url=url_builder('/api/mapping', project_folder, data_file, sheet_name, yaml_file)
    response=client.get(url)
    data = response.data.decode("utf-8")
    data = json.loads(data)
    return data


def url_builder(base, project_folder, data_file, sheet_name, yaml_file=None, annotation_file=None):
    url=base+f'?project_folder={project_folder}&data_file={data_file}&sheet_name={sheet_name}'
    if yaml_file:
        url+=f'&mapping_file={yaml_file}&mapping_type=Yaml'
    elif annotation_file:
        url+=f'&mapping_file={annotation_file}&mapping_type=Annotation'
    return url
