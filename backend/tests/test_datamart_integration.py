import os
import json
from tests.utils import (client, create_project, load_data_file)


def test_datamart_integration(client):
    #create project:
    project_folder=create_project(client)

    #get old settings:
    url='/api/project/settings?project_folder={project_folder}'.format(project_folder=project_folder)
    response=client.get(url)
    data = response.data.decode("utf-8")
    data = json.loads(data)
    old_global_settings=data["project"]

    #set new settings
    url='/api/project/settings?project_folder={project_folder}'.format(project_folder=project_folder)
    endpoint='https://datamart:datamart-api-789@dsbox02.isi.edu:8888/datamart-api-wm'
    response=client.put(url,
            json=dict(
            datamartApi=endpoint,
            datamartIntegration=True
        ))

    #upload data file
    filename=os.path.join(os.path.dirname(__file__), "files_for_tests", "region.xlsx")
    response=load_data_file(client, project_folder, filename)
    data = response.data.decode("utf-8")
    data = json.loads(data)

    #reset to old settings:
    url='/api/project/settings?project_folder={project_folder}'.format(project_folder=project_folder)
    endpoint='https://datamart:datamart-api-789@dsbox02.isi.edu:8888/datamart-api'  #'https://datamart:datamart-api-789@dsbox02.isi.edu:8888/datamart-api-wm'
    response=client.put(url,
            json=dict(
            datamartApi=old_global_settings["datamart_api"],
            datamartIntegration=old_global_settings["datamart_integration"]
        ))

    #check validity
    #with open (os.path.join(os.path.dirname(__file__), "files_for_tests", "datamart_results.json"), 'w') as f:
    #     json.dump(data["layers"], f, sort_keys=False, indent=4)

    with open (os.path.join(os.path.dirname(__file__), "files_for_tests", "datamart_results.json"), 'r') as f:
        expected_layers=json.load(f)

    assert data["layers"]==expected_layers
