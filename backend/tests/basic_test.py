from io import StringIO
import json
import os
import csv
import tempfile
from tests.utils import (client, BaseClass, create_project,
                load_data_file, load_yaml_file, url_builder,
                load_wikifier_file, load_item_file)


project_folder=None #we need to use a global for some reason... self.project_folder does not work.

def get_data(data):
    data = json.loads(data)
    if "error" in data:
        assert data=="" #a way to see the actual error message from failed runs
    return data


class TestBasicYamlWorkflow(BaseClass):
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
        url=url_builder('/api/wikifier', project_folder, None, None)
        response=client.post(url,
            json=dict(
            filepath=filename
            )
        )
        data = response.data.decode("utf-8")
        data = get_data(data)
        data.pop('project')
        self.results_dict['add_wikifier_file']=data
        self.compare_jsons(data, 'add_wikifier_file')


    def test_06_add_items_file(self, client):
        filename=os.path.join(self.files_dir, "kgtk_item_defs.tsv")
        url=url_builder('/api/project/entities', project_folder, None, None)
        response=client.post(url,
            json=dict(
            filepath=filename
            )
        )
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
        url=url_builder(f'/api/project/export/tsv', project_folder, self.data_file, self.sheet_name, self.yaml_file)
        tf =   os.path.join(tempfile.gettempdir(), os.urandom(24).hex())
        response=client.post(url, json=dict(filepath=tf))
        with open(tf, 'r') as ef, open(os.path.join(self.files_dir, "download.tsv"), 'r', encoding="utf-8") as f:
            expected_reader= csv.DictReader(ef, delimiter="\t")
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
        ann = data.pop("annotations", None) #TODO- test correctness of annotation
        yaml = data.pop("yamlContent", None) #TODO- test correctness of yaml
        self.results_dict['change_sheet']=data
        self.compare_jsons(data, 'change_sheet')


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

    def test_get_entities_1(self, client):
        url='/api/project/entities?project_folder={project_folder}'.format(project_folder=project_folder)
        response=client.get(url)
        data = response.data.decode("utf-8")
        data = get_data(data)
        assert data["kgtk_item_defs.tsv"]["P2006020002"]['description']=='Qualifiers used to describe a variable. E.g., FertilizerType, Source, etc.'


    def test_get_entities_2(self, client):
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


class TestBasicAnnotationWorkflow(BaseClass):
    files_dir=os.path.join(os.path.dirname(__file__), "files_for_tests", "copy_annotations_desktop_version")

    def test_load_project(self, client):
        #GET f'/api/project?project_folder={self.files_dir}'
        pass

    def test_create_annotation(self, client):
        '"POST //api/annotation/create?project_folder={self.files_dir} HTTP/1.1"'

    def test_suggest_annotation(self, client):
        '/api/annotation/guess-blocks?project_folder={self.files_dir}&data_file=BCcountries.xlsx&sheet_name=B-countries&mapping_file=annotations/BCcountries-B-countries.annotation&mapping_type=Annotation&map_start=0&map_end=50&data_start=0&data_end=50'
        pass

    def test_wikifiy_country_region(self, client):
        "POST //api/web/wikify_region?project_folder={self.files_dir}&data_file=BCcountries.xlsx&sheet_name=B-countries&map_start=0&map_end=50&data_start=0&data_end=50 HTTP/1.1"
        payload={"selection":{"x1":1,"x2":1,"y1":2,"y2":4}}

    def test_get_partial_csv(self, client):
        "GET //api/partialcsv?project_folder={self.files_dir}&data_file=BCcountries.xlsx&sheet_name=B-countries&mapping_file=annotations/BCcountries-B-countries.annotation&mapping_type=Annotation HTTP/1.1"

    def test_auto_create_nodes(self, client):
        "POST http://localhost:13000//api/auto_wikinodes?project_folder={self.files_dir}&data_file=BCcountries.xlsx&sheet_name=B-countries&map_start=0&map_end=52&data_start=0&data_end=52"
        payload={"selection":{"x1":1,"x2":1,"y1":2,"y2":4},"is_property":False}

    def test_search_pnode(self, client):
        "GET //api/properties?q=quantity HTTP/1.1"

    def test_create_node(self, client):
        "POST //api/create_node?project_folder={self.files_dir}&data_file=BCcountries.xlsx&sheet_name=B-countries&map_start=0&map_end=53&data_start=0&data_end=53 HTTP/1.1"
        payload={"is_property":True,"label":"custom-quantity","description":"","data_type":"quantity"}

    def test_copy_annotation_1(self, client):
        "http://localhost:13000//api/annotation/copy?project_folder={self.files_dir}&map_start=0&map_end=50&data_start=0&data_end=50"
        payload = {"source":{"dir":self.files_dir,"dataFile":"BCcountries.xlsx","sheetName":"B-countries","annotation":"annotations/BCcountries-B-countries.annotation"},
                    "destination":{"dir":self.files_dir,"dataFile":"BCcountries.xlsx","sheetName":"C-countries","annotation":"annotations/BCcountries-C-countries.annotation"}}

    def test_copy_annotation_2(self, client):
        "http://localhost:13000//api/annotation/copy?project_folder={self.files_dir}&map_start=0&map_end=50&data_start=0&data_end=50"
        payload = {"source":{"dir":self.files_dir,"dataFile":"BCcountries.xlsx","sheetName":"C-countries","annotation":"annotations/BCcountries-C-countries.annotation"},"destination":{"dir":self.files_dir,"dataFile":"countries with ID.csv","sheetName":"","annotation":"annotations/countries with ID-countries with ID.csv.annotation"}}

    def test_edit_annotation(self, client):
        "http://localhost:13000//api/annotation?project_folder={self.files_dir}&data_file=countries%20with%20ID.csv&sheet_name=countries%20with%20ID.csv&map_start=0&map_end=50&data_start=0&data_end=50"
        payload={"annotations":[{"id":"cb00d0e9-f4e6-4ded-a3c8-19aa8941762f","link":"","links":{},"property":{"data_type":"time","description":"time and date something took place, existed or a statement was true","id":"P585","label":"point in time"},"role":"qualifier","selection":{"x1":3,"x2":8,"y1":1,"y2":1},"type":"time"},{"id":"7b0772cd-c6e4-4db1-9a52-bc2f975adbf6","link":"60b0a16c-802d-4943-8b79-7bdb4c248bc5","links":{},"role":"mainSubject","selection":{"x1":1,"x2":1,"y1":2,"y2":6},"type":"wikibaseitem"},{"id":"60b0a16c-802d-4943-8b79-7bdb4c248bc5","link":"","links":{"mainSubject":"7b0772cd-c6e4-4db1-9a52-bc2f975adbf6"},"property":{"data_type":"quantity","description":"","id":"PCustomNode-customquantity","label":"custom-quantity"},"role":"dependentVar","selection":{"x1":3,"x2":8,"y1":2,"y2":6},"type":"quantity","selectedArea":"C2:H6"}],"title":"annotations/countries with ID-countries with ID.csv.annotation"}

    def test_suggest_block(self, client):
        "PUT http://localhost:13000//api/annotation/suggest?project_folder={self.files_dir}&data_file=countries%20with%20ID.csv&sheet_name=countries%20with%20ID.csv"
        payload={"selection":{"x1":2,"x2":2,"y1":2,"y2":6},"annotations":[{"id":"7b0772cd-c6e4-4db1-9a52-bc2f975adbf6","link":"60b0a16c-802d-4943-8b79-7bdb4c248bc5","links":{},"role":"mainSubject","selection":{"x1":1,"x2":1,"y1":2,"y2":6},"type":"wikibaseitem"},{"id":"60b0a16c-802d-4943-8b79-7bdb4c248bc5","link":"","links":{"mainSubject":"7b0772cd-c6e4-4db1-9a52-bc2f975adbf6"},"property":{"data_type":"quantity","description":"","id":"PCustomNode-customquantity","label":"custom-quantity"},"role":"dependentVar","selection":{"x1":3,"x2":8,"y1":2,"y2":6},"type":"quantity"},{"id":"cb00d0e9-f4e6-4ded-a3c8-19aa8941762f","link":"","links":{},"property":{"data_type":"time","description":"time and date something took place, existed or a statement was true","id":"P585","label":"point in time"},"role":"qualifier","selection":{"x1":3,"x2":8,"y1":1,"y2":1},"type":"time"}]}

    def test_rename_file(self, client):
        "POST http://localhost:13000//api/files/rename?project_folder={self.files_dir}"
        payload={"old_name":"horizontal data.xlsx","new_name":"test.xlsx"}

    def test_delete_file(self, client):
        "POST http://localhost:13000//api/files/delete?project_folder={self.files_dir}"
        payload={"file_name":"horizontal data.xlsx","delete":False}

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


