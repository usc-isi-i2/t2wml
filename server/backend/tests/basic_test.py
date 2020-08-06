from pathlib import Path
import sys
file_path=Path(__file__).parents[2] 
sys.path.insert(0, file_path)
fle_path=file_path / "backend"
sys.path.insert(0, file_path)


import os
import tempfile
import pytest
from backend.app_config import app

@pytest.fixture
def client():
    app.config['TESTING']=True
    db_fd, app.config['DATABASE'] = tempfile.mkstemp()

    with app.test_client() as client:
        #with app.app_context():
        yield client
    
    os.close(db_fd)
    os.unlink(app.config['DATABASE'])

def test_basic_get(client):
    rv=client.get("/api/projects") 
    assert rv.status_code==200