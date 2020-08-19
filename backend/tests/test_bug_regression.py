import os
import json
from tests.utils import (client, create_project, sanitize_highlight_region, load_data_file, load_yaml_file, 
                        load_wikifier_file, load_properties_file, get_project_files)


def test_switching_back_to_sheets(client):
    #the bug is described in issue 156
    files_dir=os.path.join(os.path.dirname(__file__), "files_for_tests", "homicide")


    pid=create_project(client, "Regression test- switching sheets")
    load_data_file(client, pid, os.path.join(files_dir, "homicide_report_total_and_sex.xlsx"))


    #load yaml
    response=load_yaml_file(client, pid, filename=os.path.join(files_dir, "t2wml", "table-1a.yaml"))
    data = response.data.decode("utf-8")
    yaml_1_data = json.loads(data)["yamlRegions"]
    

    #switch tab
    url='/api/data/{pid}/{sheet_name}'.format(pid=pid,sheet_name="table-1b")
    response=client.get(url) 

    #load new yaml
    response=load_yaml_file(client, pid, filename=os.path.join(files_dir, "t2wml", "table-1b.yaml"))
    data = response.data.decode("utf-8")
    yaml_2_data = json.loads(data)["yamlRegions"]

    #switch back to previous tab
    url='/api/data/{pid}/{sheet_name}'.format(pid=pid,sheet_name="table-1a")
    response=client.get(url) 
    data = response.data.decode("utf-8")
    switch_back_data = json.loads(data)["yamlData"]["yamlRegions"]

    #some of the results are sent back as unordered lists and need to be compared separately
    
    set_keys=sanitize_highlight_region(yaml_1_data, switch_back_data)
    for key in set_keys:
        yaml_2_data.pop(key, None)
    
    assert yaml_1_data!=yaml_2_data
    assert yaml_1_data==switch_back_data

def test_empty_cells(client):
    #the bug is described in issue 153
    files_dir=os.path.join(os.path.dirname(__file__), "files_for_tests", "empty_cells")

    #load project
    response=client.post('/api/project/load',
    data=dict(
            path=files_dir
        )
    )
    data = response.data.decode("utf-8")
    data = json.loads(data)
    pid=str(data['pid'])

    #change project settings
    url='/api/project/{pid}/settings'.format(pid=pid)
    response=client.put(url,
            data=dict(
            warnEmpty=False
        )) 

    #get project results
    data= get_project_files(client, pid)

    #change project settings
    url='/api/project/{pid}/settings'.format(pid=pid)
    response=client.put(url,
            data=dict(
            warnEmpty=True
        )) 
    
    #reapply yaml:
    response=load_yaml_file(client, pid, filename=os.path.join(files_dir, "t2wml.yaml"))
    data2 = response.data.decode("utf-8")
    data2 = json.loads(data2)

    error_cells_1=data["yamlData"]["yamlRegions"]["dangerCells"]['list']
    error_cells_2=data2["yamlRegions"]["dangerCells"]["list"]
    assert set(error_cells_1)!=set(error_cells_2)