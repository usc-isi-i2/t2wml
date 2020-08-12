import tempfile
import os
import pytest
import json

from flask_migrate import upgrade
from application import app

BACKEND_DIR = os.path.abspath(os.path.dirname(os.path.dirname(__file__)))

@pytest.fixture(scope="session")
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
            for index, item in enumerate(input1):
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