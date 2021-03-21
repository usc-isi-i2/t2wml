from io import StringIO
import json
import os
import csv
from tests.utils import (client, BaseClass, create_project,
                load_data_file, load_yaml_file, url_builder,
                load_wikifier_file, load_item_file)


project_folder=None #we need to use a global for some reason... self.project_folder does not work.

def get_data(data):
    data = json.loads(data)
    if "error" in data:
        assert data=="" #a way to see the actual error message from failed runs
    return data


class TestBasicWorkflow(BaseClass):
    files_dir=os.path.join(os.path.dirname(__file__), "files_for_tests", "aid")
    expected_results_path=os.path.join(files_dir, "results.json")
    results_dict={}

    data_file='dataset.xlsx'
    sheet_name="Sheet3"
    yaml_file="test.yaml"

    def test_01_add_project(self, client):
        #POST /api/project
        global project_folder
        project_folder=create_project(client)
        assert project_folder is not None

    def test_02_get_project(self, client):
        url='/api/project?project_folder={project_folder}'.format(project_folder=project_folder)
        response=client.get(url)
        data = response.data.decode("utf-8")
        data = get_data(data)
        assert data["project"]["directory"]==project_folder


    def test_03_add_data_file(self, client):
        filename=os.path.join(self.files_dir, self.data_file)
        response=load_data_file(client, project_folder, filename)
        data = response.data.decode("utf-8")
        data = get_data(data)
        data.pop('project')
        self.results_dict['add_data_file']=data
        self.compare_jsons(data, 'add_data_file')

    def test_05_add_wikifier_file(self, client):
        filename=os.path.join(self.files_dir, "consolidated-wikifier.csv")
        response=load_wikifier_file(client, project_folder, filename, self.data_file, self.sheet_name)
        data = response.data.decode("utf-8")
        data = get_data(data)
        data.pop('project')
        self.results_dict['add_wikifier_file']=data
        self.compare_jsons(data, 'add_wikifier_file')


    def test_06_add_items_file(self, client):
        filename=os.path.join(self.files_dir, "kgtk_item_defs.tsv")
        response=load_item_file(client, project_folder, filename, self.data_file, self.sheet_name)
        data = response.data.decode("utf-8")
        data = get_data(data)
        data.pop('project')
        self.results_dict['add_items']=data
        self.compare_jsons(data, 'add_items')

    def test_08_add_yaml_file(self, client):
        filename=os.path.join(self.files_dir, self.yaml_file)
        response=load_yaml_file(client, project_folder, filename, self.data_file, "Sheet3")
        data = response.data.decode("utf-8")
        data = get_data(data)
        data.pop('project')
        self.results_dict['add_yaml']=data
        self.compare_jsons(data, 'add_yaml')

    def test_11_get_download(self, client):
        #GET '/api/project/{project_folder}/download/<filetype>'
        url=url_builder(f'/api/project/download/tsv', project_folder, self.data_file, self.sheet_name, self.yaml_file)
        response=client.get(url)
        data = response.data.decode("utf-8")
        data = json.loads(data)
        data= data["data"]
        expected_reader= csv.DictReader(StringIO(data), delimiter="\t")
        with open(os.path.join(self.files_dir, "download.tsv"), 'r', encoding="utf-8") as f:
            reader = csv.DictReader(f, delimiter="\t")
            for e_row_dict, o_row_dict in zip(expected_reader, reader):
                if e_row_dict["label"]=="P5017": #edit timestamp, always changes
                    continue
                if e_row_dict["id"] in ["47-label", "475-label", "103-label", "782-label", "22-label", "73-label"]:
                    continue
                assert e_row_dict==o_row_dict
    def test_12_change_sheet(self, client):
        #GET /api/data/{project_folder}/<sheet_name>
        url=url_builder('/api/table', project_folder, self.data_file, "Sheet4")
        response=client.get(url)
        data = response.data.decode("utf-8")
        data = get_data(data)
        data.pop('project', None)
        self.results_dict['change_sheet']=data
        self.compare_jsons(data, 'change_sheet')

    def xtest_12_wikify_region(self, client):
        # test closed until the new endpoint etc are working
        #POST '/api/wikifier_service/{project_folder}'
        url=url_builder('/api/wikifier_service', project_folder, self.data_file, "Sheet4")
        response=client.post(url,
                json=dict(
                action="wikify_region",
                region="I3:I8",
                context="wikifier test",
                flag="0"
                )
            )

        data = response.data.decode("utf-8")
        data = get_data(data)
        data.pop('project')
        self.results_dict['wikify_region']=data
        self.compare_jsons(data, 'wikify_region')

    def test_14_settings(self, client):
        from t2wml.settings import t2wml_settings
        #PUT '/api/project/{project_folder}/settings'
        url='/api/project/settings?project_folder={project_folder}'.format(project_folder=project_folder)
        endpoint='https://query.wikidata.org/bigdata/namespace/wdq/sparql'
        response=client.put(url,
                json=dict(
                endpoint=endpoint,
                warnEmpty=False
            ))
        assert t2wml_settings.wikidata_provider.sparql_endpoint==endpoint

        #GET '/api/project/{project_folder}/settings'
        url='/api/project/settings?project_folder={project_folder}'.format(project_folder=project_folder)
        response=client.get(url)
        data = response.data.decode("utf-8")
        data = get_data(data)
        project=data.pop('project')
        assert project["sparql_endpoint"]=='https://query.wikidata.org/bigdata/namespace/wdq/sparql'
        assert project["warn_for_empty_cells"]==False

    def test_get_entities(self, client):
        url='/api/project/entities?project_folder={project_folder}'.format(project_folder=project_folder)
        response=client.get(url)
        data = response.data.decode("utf-8")
        data = get_data(data)
        assert data["kgtk_item_defs.tsv"]["P2006020002"]['description']=='Qualifiers used to describe a variable. E.g., FertilizerType, Source, etc.'


    def test_get_entities(self, client):
        url='/api/project/entities?project_folder={project_folder}'.format(project_folder=project_folder)
        response=client.put(url,
            json=dict(
                entity_file="kgtk_item_defs.tsv",
                updated_entries={"P2006020002":{'data_type': 'WikibaseProperty', 'description': 'Qualifiers used to describe a variable. E.g., FertilizerType, Source, etc...', 'label': 'qualifier'}}
            ))
        data = response.data.decode("utf-8")
        data = get_data(data)
        assert data["kgtk_item_defs.tsv"]["P2006020002"]['description']=='Qualifiers used to describe a variable. E.g., FertilizerType, Source, etc...'
        response=client.put(url,
            json=dict(
                entity_file="kgtk_item_defs.tsv",
                updated_entries={"P2006020002":{'data_type': 'WikibaseProperty', 'description': 'Qualifiers used to describe a variable. E.g., FertilizerType, Source, etc.', 'label': 'qualifier'}}
            ))

    def xtest_999_save(self):
        #used when overwriting all old results with new ones
        with open(self.expected_results_path, 'w') as f:
            json.dump(self.results_dict, f, sort_keys=True, indent=4)



class TestLoadingProject(BaseClass):
    files_dir=os.path.join(os.path.dirname(__file__), "files_for_tests", "aid")
    expected_results_path=os.path.join(files_dir, "project_results.json")
    results_dict={}

    def test_11_get_loaded_yaml_files(self, client):
        url=url_builder('/api/table', self.files_dir, "dataset.xlsx", "Sheet3", "test.yaml")
        response=client.get(url)
        data = response.data.decode("utf-8")
        data = get_data(data)
        data.pop('project', None)
        self.results_dict['load_from_path']=data
        #with open(self.expected_results_path, 'w') as f:
        #    json.dump(self.results_dict, f, sort_keys=False, indent=4)

        self.compare_jsons(data, 'load_from_path')


class TestCleaning(BaseClass):
    files_dir=os.path.join(os.path.dirname(__file__), "files_for_tests", "homicide")
    def test_11_get_cleaned_data(self, client):
        url=url_builder('/api/mapping', self.files_dir, "homicide_report_total_and_sex.xlsx", "table-1a", "t2wml/table-1a.yaml")
        response=client.get(url)
        data = response.data.decode("utf-8")
        data = json.loads(data)
        cleaned_entries = data['layers']['cleaned']['entries']
        assert len(cleaned_entries)== 3
        assert cleaned_entries[1] == {'cleaned': '200', 'indices': [[6,3]], 'original': '4'}
