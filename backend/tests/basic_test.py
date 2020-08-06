import json
import os
import tempfile
import pytest

# To import app_config we need to add the backend directory into sys.path
import sys
BACKEND_DIR = os.path.abspath(os.path.dirname(os.path.dirname(__file__)))
if BACKEND_DIR not in sys.path:
    sys.path.append(BACKEND_DIR)

from application import app

pid=None

@pytest.fixture
def client():
    app.config['TESTING']=True
    db_fd, app.config['DATABASE'] = tempfile.mkstemp()

    with app.test_client() as client:
        #with app.app_context():
        yield client
    
    os.close(db_fd)
    os.unlink(app.config['DATABASE'])


def test_get_projects_list(client):
    #GET /api/projects
    response=client.get('/api/projects') 
    data = response.data.decode("utf-8")
    data = json.loads(data)
    assert response.status_code==200

def test_add_project(client):
    #POST /api/project
    response=client.post('/api/project',
        data=dict(
            ptitle="Unit test"
        )
    )
    data = response.data.decode("utf-8")
    data = json.loads(data)
    global pid
    pid=data['pid']
    assert response.status_code==201

def test_add_data_file(client):
    print(pid)
    #POST /api/data/<pid>
    pass

def test_add_properties_file(client):
    #POST /api/project/<pid>/properties
    pass

def test_add_wikifier_file(client):
    #POST '/api/wikifier/<pid>'
    pass

def test_change_sheet(client):
    #GET /api/data/<pid>/<sheet_name>
    pass

def test_add_yaml_file(client):
    #POST '/api/yaml/<pid>'
    pass

def test_get_project_files(client):
    #GET /api/project/<pid>
    pass

def test_wikify_region(client):
    #POST '/api/wikifier_service/<pid>'
    pass

def test_change_project_name(client):
    #PUT '/api/project/<pid>'
    pass

def test_change_sparql_endpoint(client):
    #PUT '/api/project/<pid>/sparql'
    pass

def test_delete_project(client):
    #this test must be sequentially last (do not run pytest in parallel)
    #DELETE '/api/project/<pid>'
    url_str="/api/project/"+str(pid)
    response=client.delete(url_str)
    data = response.data.decode("utf-8")
    data = json.loads(data)


'''



POST /api/project/<pid>/items
GET /api/qnode/<qid>

GET '/api/data/<pid>/cell/<col>/<row>'
GET '/api/project/<pid>/download/<filetype>'



'''