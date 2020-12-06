import os
import json
from tests.utils import (client, create_project, load_data_file)


t2wml_folder = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))


def test_datamart_integration(client):
    #create project:
    project_folder=create_project(client)

    #get old settings:
    url='/api/project/settings?project_folder={project_folder}'.format(project_folder=project_folder)
    response=client.get(url) 
    data = response.data.decode("utf-8")
    data = json.loads(data)
    old_global_settings=data["globalSettings"]

    #set new settings
    url='/api/project/settings?project_folder={project_folder}'.format(project_folder=project_folder)
    endpoint='https://datamart:datamart-api-789@dsbox02.isi.edu:8888/datamart-api'  #'https://datamart:datamart-api-789@dsbox02.isi.edu:8888/datamart-api-wm'
    response=client.put(url,
            data=dict(
            datamartApi=endpoint, 
            datamartIntegration=True
        )) 
    
    #upload data file
    filename=os.path.join(t2wml_folder, "tutorial", "Region_Tutorial", "region.xlsx")
    response=load_data_file(client, project_folder, filename)
    data = response.data.decode("utf-8")
    data = json.loads(data)  
    print(data)

    #reset to old settings:
    url='/api/project/settings?project_folder={project_folder}'.format(project_folder=project_folder)
    endpoint='https://datamart:datamart-api-789@dsbox02.isi.edu:8888/datamart-api'  #'https://datamart:datamart-api-789@dsbox02.isi.edu:8888/datamart-api-wm'
    response=client.put(url,
            data=dict(
            datamartApi=old_global_settings["datamart_api"], 
            datamartIntegration=old_global_settings["datamart_integration"]
        )) 