import json
import os

from tests.utils import client, BaseClass
    

pid=None #we need to use a global pid for some reason... self.pid does not work.




class TestBasicWorkflow(BaseClass):
    files_dir=os.path.join(os.path.dirname(__file__), "files_for_tests", "aid")
    expected_results_path=os.path.join(files_dir, "results.json")

    def test_00_get_projects_list(self, client):
        #GET /api/projects
        response=client.get('/api/projects') 
        data = response.data.decode("utf-8")
        data = json.loads(data)
        assert response.status_code==200

    def test_01_add_project(self, client):
        #POST /api/project
        response=client.post('/api/project',
            data=dict(
                ptitle="Unit test"
            )
        )
        data = response.data.decode("utf-8")
        data = json.loads(data)
        global pid
        pid=str(data['pid'])
        assert response.status_code==201

    def test_02_get_project_files(self, client):
        url= '/api/project/{pid}'.format(pid=pid)
        response=client.get(url)
        data = response.data.decode("utf-8")
        data = json.loads(data)
        assert data == {
            'name': 'Unit test',
            'tableData': None,
            'yamlData': None,
            'wikifierData': None
        }

    def test_03_add_data_file(self, client):   
        url = '/api/data/{pid}'.format(pid=pid)
        filename=os.path.join(self.files_dir, "dataset.xlsx")
        with open(filename, 'rb') as f:
            response=client.post(url,
                data=dict(
                file=f
                )
            )

        data = response.data.decode("utf-8")
        data = json.loads(data)
        self.results_dict['add_data_file']=data
        data['tableData'].pop('filename', None)
        self.expected_results_dict['add_data_file']['tableData'].pop('filename', None)
        self.compare_jsons(data, 'add_data_file')

    def test_04_add_properties_file(self, client):
        url = '/api/project/{pid}/properties'.format(pid=pid)
        filename=os.path.join(self.files_dir, "kgtk_properties.tsv")
        with open(filename, 'rb') as f:
            response=client.post(url,
                data=dict(
                file=f
                )
            )

        data = response.data.decode("utf-8")
        data = json.loads(data)
        self.results_dict['add_properties_file']=data
        self.compare_jsons(data, 'add_properties_file')

    def test_05_add_wikifier_file(self, client):
        url='/api/wikifier/{pid}'.format(pid=pid)
        filename=os.path.join(self.files_dir, "consolidated-wikifier.csv")
        with open(filename, 'rb') as f:
            response=client.post(url,
                data=dict(
                file=f
                )
            )

        data = response.data.decode("utf-8")
        data = json.loads(data)
        self.results_dict['add_wikifier_file']=data
        self.compare_jsons(data, 'add_wikifier_file')


    def test_06_add_items_file(self, client):
        #POST /api/project/{pid}/items
        url='/api/project/{pid}/items'.format(pid=pid)
        filename=os.path.join(self.files_dir, "kgtk_item_defs.tsv")
        with open(filename, 'rb') as f:
            response=client.post(url,
                data=dict(
                file=f
                )
            )

        data = response.data.decode("utf-8")
        data = json.loads(data)
        self.results_dict['add_items']=data
        self.compare_jsons(data, 'add_items')

    def test_08_add_yaml_file(self, client):
        url='/api/yaml/{pid}'.format(pid=pid)
        filename=os.path.join(self.files_dir, "test.yaml")
        with open(filename, 'r') as f:
            response=client.post(url,
                data=dict(
                yaml=f.read()
                )
            )

        data = response.data.decode("utf-8")
        data = json.loads(data)
        self.results_dict['add_yaml']=data

        #some of the results are sent back as unordered lists and need to be compared separately
        set_keys=[]
        for key in data["yamlRegions"]:
            if "list" in data["yamlRegions"][key]:
                set_keys.append(key)
                test1=set(data["yamlRegions"][key]["list"])
                test2=set(self.expected_results_dict["add_yaml"]["yamlRegions"][key]["list"])
                assert test1==test2
        for key in set_keys:
            data["yamlRegions"].pop(key, None)
            self.expected_results_dict["add_yaml"]["yamlRegions"].pop(key, None)

        self.compare_jsons(data, 'add_yaml')

    def test_09_get_cell(self, client):
        #GET '/api/data/{pid}/cell/<col>/<row>'
        url='/api/data/{pid}/cell/{col}/{row}'.format(pid=pid, col="G", row=4)
        response=client.get(url) 
        data = response.data.decode("utf-8")
        data = json.loads(data)
        self.results_dict['get_cell']=data
        self.compare_jsons(data, 'get_cell')

    def test_10_get_node(self, client):
        url='/api/qnode/{pid}/{qid}'.format(pid=pid, qid="Q21203")
        response=client.get(url) 
        data = response.data.decode("utf-8")
        data = json.loads(data)
        assert data['label']=='Aruba'
        url='/api/qnode/{pid}/{qid}'.format(pid=pid, qid="P17")
        response=client.get(url) 
        data2 = response.data.decode("utf-8")
        data2 = json.loads(data2)
        assert data2['label']=='country'

    def test_11_get_download(self, client):
        #GET '/api/project/{pid}/download/<filetype>'
        url='/api/project/{pid}/download/{filetype}'.format(pid=pid, filetype="tsv")
        response=client.get(url) 
        data = response.data.decode("utf-8")
        data = json.loads(data)
        data=data["data"]
        with open(os.path.join(self.files_dir, "download.tsv"), 'r') as f:
            expected=f.read()
        assert expected==data

    def test_12_change_sheet(self, client):
        #GET /api/data/{pid}/<sheet_name>
        url='/api/data/{pid}/{sheet_name}'.format(pid=pid,sheet_name="Sheet4")
        response=client.get(url) 
        data = response.data.decode("utf-8")
        data = json.loads(data)
        self.results_dict['change_sheet']=data
        data['tableData'].pop('filename', None)
        self.expected_results_dict['change_sheet']['tableData'].pop('filename', None)
        self.compare_jsons(data, 'change_sheet')

    def test_12_wikify_region(self, client):
        #POST '/api/wikifier_service/{pid}'
        url='/api/wikifier_service/{pid}'.format(pid=pid)
        response=client.post(url,
                data=dict(
                action="wikify_region",
                region="I3:I8",
                context="wikifier test",
                flag="0"
                )
            )

        data = response.data.decode("utf-8")
        data = json.loads(data)
        self.results_dict['wikify_region']=data
        self.compare_jsons(data, 'wikify_region')

    def test_13_change_project_name(self, client):
        url='/api/project/{pid}'.format(pid=pid)
        ptitle="Unit test renamed"
        response=client.put(url,
                data=dict(
                ptitle=ptitle
            )) 
        data = response.data.decode("utf-8")
        data = json.loads(data)
        assert data['projects'][0]['ptitle']==ptitle

    def test_14_change_sparql_endpoint(self, client):
        from t2wml.settings import t2wml_settings
        #PUT '/api/project/{pid}/sparql'
        url='/api/project/{pid}/sparql'.format(pid=pid)
        endpoint='https://query.wikidata.org/bigdata/namespace/wdq/sparql'
        response=client.put(url,
                data=dict(
                endpoint=endpoint
            )) 
        assert t2wml_settings.wikidata_provider.sparql_endpoint==endpoint

    def test_99_delete_project(self, client):
        #this test must be sequentially last (do not run pytest in parallel)
        #DELETE '/api/project/{pid}'
        url_str="/api/project/{pid}".format(pid=pid)
        response=client.delete(url_str)
        data = response.data.decode("utf-8")
        data = json.loads(data)
        #used when overwriting all old results with new ones 
        #with open(self.expected_results_path, 'w') as f:
        #    json.dump(self.results_dict, f, sort_keys=False, indent=4)
        assert data["projects"]==[]



