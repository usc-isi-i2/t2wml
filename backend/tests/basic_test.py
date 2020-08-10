import json
import os
import tempfile
import pytest

# To import application we need to add the backend directory into sys.path
import sys
BACKEND_DIR = os.path.abspath(os.path.dirname(os.path.dirname(__file__)))
if BACKEND_DIR not in sys.path:
    sys.path.append(BACKEND_DIR)

from flask_migrate import upgrade

from application import app

files_dir=os.path.join(os.path.dirname(__file__), "files_for_tests", "aid")


pid=None
results_dict={}

with open(os.path.join(files_dir, "results.json"), 'r', encoding="utf-8") as f:
    expected_results_dict=json.load(f)

def recurse_lists_and_dicts(input1, input2):
    if isinstance(input1, dict):
        assert input1.keys()==input2.keys()
        for key in input1:
            recurse_lists_and_dicts(input1[key], input2[key])
            
    elif isinstance(input1, list):
        assert len(input1)==len(input2)
        for index, item in enumerate(input1):
            recurse_lists_and_dicts(input1[index], input2[index])

    assert input1==input2

def compare_jsons(data, expected_key):
    expected_data=expected_results_dict[expected_key]
    assert data.keys()==expected_data.keys()
    for key in data:
        try:
            assert data[key]==expected_data[key]
        except AssertionError as e:
            recurse_lists_and_dicts(data[key], expected_data[key])
            raise e



@pytest.fixture(scope="module")
def client(request):
    def fin():
        os.close(db_fd)
        os.unlink(name)
    app.config['TESTING']=True
    db_fd, name = tempfile.mkstemp()
    app.config['SQLALCHEMY_DATABASE_URI']='sqlite:///' +name
    request.addfinalizer(fin)
    with app.app_context():
        upgrade(directory=os.path.join(BACKEND_DIR, 'migrations'))

    with app.test_client() as client:
        yield client
    



def test_0_get_projects_list(client):
    #GET /api/projects
    response=client.get('/api/projects') 
    data = response.data.decode("utf-8")
    data = json.loads(data)
    assert response.status_code==200

def test_01_add_project(client):
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

def test_02_get_project_files(client):
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

def test_03_add_data_file(client):   
    url = '/api/data/{pid}'.format(pid=pid)
    filename=os.path.join(files_dir, "dataset.xlsx")
    with open(filename, 'rb') as f:
        response=client.post(url,
            data=dict(
            file=f
            )
        )

    data = response.data.decode("utf-8")
    data = json.loads(data)
    results_dict['add_data_file']=data
    compare_jsons(data, 'add_data_file')

def test_04_add_properties_file(client):
    url = '/api/project/{pid}/properties'.format(pid=pid)
    filename=os.path.join(files_dir, "kgtk_properties.tsv")
    with open(filename, 'rb') as f:
        response=client.post(url,
            data=dict(
            file=f
            )
        )

    data = response.data.decode("utf-8")
    data = json.loads(data)
    results_dict['add_properties_file']=data
    compare_jsons(data, 'add_properties_file')

def test_05_add_wikifier_file(client):
    url='/api/wikifier/{pid}'.format(pid=pid)
    filename=os.path.join(files_dir, "consolidated-wikifier.csv")
    with open(filename, 'rb') as f:
        response=client.post(url,
            data=dict(
            file=f
            )
        )

    data = response.data.decode("utf-8")
    data = json.loads(data)
    results_dict['add_wikifier_file']=data
    compare_jsons(data, 'add_wikifier_file')


def test_06_add_items_file(client):
    #POST /api/project/{pid}/items
    url='/api/project/{pid}/items'.format(pid=pid)
    filename=os.path.join(files_dir, "kgtk_item_defs.tsv")
    with open(filename, 'rb') as f:
        response=client.post(url,
            data=dict(
            file=f
            )
        )

    data = response.data.decode("utf-8")
    data = json.loads(data)
    results_dict['add_items']=data
    compare_jsons(data, 'add_items')

def test_08_add_yaml_file(client):
    url='/api/yaml/{pid}'.format(pid=pid)
    filename=os.path.join(files_dir, "test.yaml")
    with open(filename, 'r') as f:
        response=client.post(url,
            data=dict(
            yaml=f.read()
            )
        )

    data = response.data.decode("utf-8")
    data = json.loads(data)
    results_dict['add_yaml']=data

    #some of the results are sent back as unordered lists and need to be compared separately
    set_keys=[]
    for key in data["yamlRegions"]:
        if "list" in data["yamlRegions"][key]:
            set_keys.append(key)
            test1=set(data["yamlRegions"][key]["list"])
            test2=set(expected_results_dict["add_yaml"]["yamlRegions"][key]["list"])
            assert test1==test2
    for key in set_keys:
        data["yamlRegions"].pop(key)
        expected_results_dict["add_yaml"]["yamlRegions"].pop(key)

    compare_jsons(data, 'add_yaml')

def test_09_get_cell(client):
    #GET '/api/data/{pid}/cell/<col>/<row>'
    url='/api/data/{pid}/cell/{col}/{row}'.format(pid=pid, col="G", row=4)
    response=client.get(url) 
    data = response.data.decode("utf-8")
    data = json.loads(data)
    results_dict['get_cell']=data
    compare_jsons(data, 'get_cell')

def test_10_get_node(client):
    #GET /api/qnode/<qid>
    url='/api/qnode/{qid}'.format(qid="Q21203")
    response=client.get(url) 
    data = response.data.decode("utf-8")
    data = json.loads(data)
    assert data['label']=='Aruba'
    url='/api/qnode/{qid}'.format(qid="P17")
    response=client.get(url) 
    data2 = response.data.decode("utf-8")
    data2 = json.loads(data2)
    assert data2['label']=='country'

def test_11_get_download(client):
    #GET '/api/project/{pid}/download/<filetype>'
    url='/api/project/{pid}/download/{filetype}'.format(pid=pid, filetype="tsv")
    response=client.get(url) 
    data = response.data.decode("utf-8")
    data = json.loads(data)
    data=data["data"]
    with open(os.path.join(files_dir, "download.tsv"), 'w') as f:
        f.write(data)

def test_12_change_sheet(client):
    #GET /api/data/{pid}/<sheet_name>
    url='/api/data/{pid}/{sheet_name}'.format(pid=pid,sheet_name="Sheet4")
    response=client.get(url) 
    data = response.data.decode("utf-8")
    data = json.loads(data)
    results_dict['change_sheet']=data
    compare_jsons(data, 'change_sheet')

def test_12_wikify_region(client):
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
    results_dict['wikify_region']=data
    compare_jsons(data, 'wikify_region')

def test_13_change_project_name(client):
    url='/api/project/{pid}'.format(pid=pid)
    ptitle="Unit test renamed"
    response=client.put(url,
            data=dict(
            ptitle=ptitle
        )) 
    data = response.data.decode("utf-8")
    data = json.loads(data)
    assert data['projects'][0]['ptitle']==ptitle

def test_14_change_sparql_endpoint(client):
    from t2wml.settings import t2wml_settings
    #PUT '/api/project/{pid}/sparql'
    url='/api/project/{pid}/sparql'.format(pid=pid)
    endpoint='https://query.wikidata.org/bigdata/namespace/wdq/sparql'
    response=client.put(url,
            data=dict(
            endpoint=endpoint
        )) 
    assert t2wml_settings['wikidata_provider'].sparql_endpoint==endpoint

def test_99_delete_project(client):
    #this test must be sequentially last (do not run pytest in parallel)
    #DELETE '/api/project/{pid}'
    url_str="/api/project/"+str(pid)
    response=client.delete(url_str)
    data = response.data.decode("utf-8")
    data = json.loads(data)
    assert data["projects"]==[]



