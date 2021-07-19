import os
import pytest
import json
from causx_application import app


@pytest.fixture(scope="session")
def client(request):
    with app.test_client() as client:
        yield client


headers = {"Authentication": ""}

data_file = ""
sheet_name = ""
annotations = []


def get_data_url():
    return f"?data_file={data_file}&sheet_name={sheet_name}"


stored_results = dict()


class TestCausxWorkflow:
    files_dir = os.path.join(os.path.dirname(
        __file__), "files_for_tests", "causx_files")
    data_file = 'world_education.xlsx'

    @property
    def expected_results(self):
        try:
            return self._expected_results
        except:
            with open(os.path.join(self.files_dir, "expected_results.json"), 'r') as f:
                expected_results=json.load(f)
                self._expected_results=expected_results
                return expected_results

    def test_01_get_token(self, client):
        url = "/api/causx/token"
        response = client.get(url)
        data = response.data.decode("utf-8")
        data = json.loads(data)
        token = data["token"]
        headers["Authentication"] = token

    def test_02_upload_data_file(self, client):
        url = '/api/causx/upload/data'
        try:
            with open(os.path.join(self.files_dir, self.data_file), 'rb') as f:
                response = client.post(url, headers=headers,
                                       data=dict(file=f)
                                       )
        except Exception as e:
            e = e
        data = response.data.decode("utf-8")
        data = json.loads(data)
        global data_file
        data_file = data["filepath"]
        global sheet_name
        sheet_name = data["sheetName"]
        #stored_results["upload_data"] = data
        assert data["filepath"]=="world_education.xlsx"

    def test_03_wikify_region(self, client):
        url = "/api/causx/wikify_region"
        url = url+get_data_url()
        response = client.post(url, headers=headers, json=dict(selection={
            "x1": 2,
            "x2": 2,
            "y1": 5,
            "y2": 199
        }, overwrite=True))
        data = response.data.decode("utf-8")
        data = json.loads(data)
        stored_results["wikify_region"] = data["layers"]["qnode"]
        assert data["layers"]["qnode"] == self.expected_results["wikify_region"]

    def test_04_auto_wikinodes(self, client):
        url = "/api/causx/auto_wikinodes"
        url = url+get_data_url()
        response = client.post(url, headers=headers,
                               json=dict(selection=dict(x1=1, x2=1, y1=2, y2=2), is_property=True, data_type='quantity'))

        #check property was created
        id = "Pworldeducation-education_index"
        url = f"/api/causx/entity/{id}"
        url = url+get_data_url()
        response = client.get(url, headers=headers)
        data = response.data.decode("utf-8")
        data = json.loads(data)
        stored_results["get_entity"] = data
        assert self.expected_results["get_entity"] == data


    def test_05_delete_wikification(self, client):
        url = "/api/causx/delete_wikification"
        url = url+get_data_url()
        response = client.post(url, headers=headers,
                               json=dict(selection=[[1, 4], [1, 4]], value="Afghanistan"))
        data = response.data.decode("utf-8")
        data = json.loads(data)
        #stored_results["wikify_delete"] = data
        assert data["layers"]["qnode"]["entries"][1]["label"]!="Afghanistan"

    def test_06_create_node(self, client):
        url = "/api/causx/create_node"
        url = url+get_data_url()
        response = client.post(url, headers=headers,
                               json=dict(label="Custom afghanistan",
                                         is_property=False,
                                         data_type=None,
                                         selection=[[1, 4], [1, 4]]))
        data = response.data.decode("utf-8")
        data = json.loads(data)
        #stored_results["create_node"] = data
        assert data["layers"]["qnode"]["entries"][1]["label"]=="Custom afghanistan"


    def test_07_get_entities(self, client):
        url = "/api/causx/project/entities"
        url = url+get_data_url()
        response = client.get(url, headers=headers)
        data = response.data.decode("utf-8")
        data = json.loads(data)
        #stored_results["get_entities"] = data

    def test_10_get_suggest_annotation(self, client):
        url = "/api/causx/annotation/guess-blocks"
        url = url+get_data_url()
        response = client.get(url, headers=headers)
        data = response.data.decode("utf-8")
        data = json.loads(data)
        stored_results["suggest_annotation"] = data["annotations"]
        global annotations
        annotations = data["annotations"]
        for r_ann, e_ann in zip(annotations, self.expected_results["suggest_annotation"]):
            for key in r_ann:
                if key in ["id", "link", "links"]: #skip keys related to randomly generated IDs
                    continue
                assert r_ann[key]==e_ann[key]

    def test_11_suggest_block(self, client):
        url = "/api/causx/annotation/suggest"
        url = url+get_data_url()
        response = client.put(url, headers=headers,
                              json=dict(selection=dict(x1=1, x2=1, y1=2, y2=2), annotations=annotations))

        data = response.data.decode("utf-8")
        data = json.loads(data)
        stored_results["suggest_block"] = data
        assert self.expected_results["suggest_block"] == data

    def test_12_upload_annotation(self, client):
        global annotations
        annotations.append({'children': {}, 'role': 'property',
                           'type': 'string', 'selection': dict(x1=1, x2=1, y1=2, y2=2)})
        url = "/api/causx/annotation"
        url = url+get_data_url()
        response = client.post(url, headers=headers,
                               json=dict(annotations=annotations))
        data = response.data.decode("utf-8")
        data = json.loads(data)
        stored_results["upload_annotation"] = data["layers"]["statement"]
        assert self.expected_results["upload_annotation"]["entries"][0]==data["layers"]["statement"]["entries"][0]
        assert len(data["layers"]["error"]["entries"])==0


    def test_13_change_settings(self, client):
        url = "/api/causx/project/settings"
        url = url+get_data_url()
        response = client.put(url, headers=headers,
                              json=dict(title="a test title", description="a test description"))

        data = response.data.decode("utf-8")
        data = json.loads(data)
        assert data["project"]["title"] == "a test title"
        assert data["project"]["description"] == "a test description"



    def test_15_put_entity(self, client):
        id = "Pworldeducation-education_index"
        url = f"/api/causx/entity/{id}"
        url = url+get_data_url()
        response = client.put(url, headers=headers,
                              json=dict(updated_entry={"label": "Education index edited",
                                                       "tags": {"DocID": "my doc id"}
                                                       }
                                        )
                              )
        data = response.data.decode("utf-8")
        data = json.loads(data)
        #stored_results["put_entity"] = data
        assert data["entity"]["label"]=="Education index edited"
        assert data["entity"]["tags"] == {
                "DocID": "my doc id",
                "FactorClass": "",
                "Normalizer": "",
                "Relevance": "",
                "Units": ""
            }

    def test_16_partial_csv(self, client):
        url = "/api/causx/partialcsv"
        url = url+get_data_url()
        response = client.get(url, headers=headers)
        data = response.data.decode("utf-8")
        data = json.loads(data)
        stored_results["partial_csv"] = data
        assert self.expected_results["partial_csv"] == data

    def test_15_download_zip_results(self, client):
        url = "/api/causx/download_zip_results"
        url = url+get_data_url()
        response = client.get(url, headers=headers)
        with open(os.path.join(self.files_dir, "results.zip"), 'wb') as f:
            f.write(response.data)

    def test_16_download_tsv(self, client):
        url = "/api/causx/project/download/tsv/results.tsv"
        url = url+get_data_url()
        response = client.get(url, headers=headers)
        with open(os.path.join(self.files_dir, "results.tsv"), 'wb') as f:
            f.write(response.data)

    def test_20_download_project(self, client):
        url = "/api/causx/download_project"
        url = url+get_data_url()
        response = client.get(url, headers=headers)
        with open(os.path.join(self.files_dir, "results.t2wmlz"), 'wb') as f:
            f.write(response.data)

    def test_21_upload_project(self, client):
        url = "/api/causx/upload/project"
        with open(os.path.join(self.files_dir, "results.t2wmlz"), 'rb') as f:
            response = client.post(url, headers=headers,
                                  data=dict(file=f))
        data = response.data.decode("utf-8")
        data = json.loads(data)
        stored_results["upload_project"] = data
        assert self.expected_results["upload_project"]["layers"] == data["layers"]

    def test_22_upload_annotation(self, client):
        url = "/api/causx/upload/annotation"
        url = url+get_data_url()
        with open(os.path.join(self.files_dir, "results.t2wmlz"), 'rb') as f:
            response = client.post(url, headers=headers,
                                   data=dict(file=f))
        data = response.data.decode("utf-8")
        data = json.loads(data)
        stored_results["upload_saved_annotation"] = data
        assert self.expected_results["upload_saved_annotation"]["layers"] == data["layers"]


    def xtest_99_save_results(self):
        with open(os.path.join(self.files_dir, "expected_results.json"), 'w') as f:
            f.write(json.dumps(stored_results))
