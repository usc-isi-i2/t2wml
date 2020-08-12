import tempfile
import os
import pytest

# To import application we need to add the backend directory into sys.path
import sys
BACKEND_DIR = os.path.abspath(os.path.dirname(os.path.dirname(__file__)))
if BACKEND_DIR not in sys.path:
    sys.path.append(BACKEND_DIR)

from flask_migrate import upgrade
from application import app

@pytest.fixture(scope="class")
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