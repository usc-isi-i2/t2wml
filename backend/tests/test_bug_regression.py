import os
import json
from tests.utils import client, sanitize_highlight_region


def test_switching_back_to_sheets(client):
    #the bug is described in issue 156
    files_dir=os.path.join(os.path.dirname(__file__), "files_for_tests", "homicide")

    #create project:
    response=client.post('/api/project',
        data=dict(
            ptitle="Regression test- switching sheets"
        )
    )
    data = response.data.decode("utf-8")
    data = json.loads(data)
    pid=str(data['pid'])
        
    #load file:
    url = '/api/data/{pid}'.format(pid=pid)
    filename=os.path.join(files_dir, "homicide_report_total_and_sex.xlsx")
    with open(filename, 'rb') as f:
        response=client.post(url,
            data=dict(
            file=f
            )
        )

    #load yaml
    url='/api/yaml/{pid}'.format(pid=pid)
    filename=os.path.join(files_dir, "t2wml", "table-1a.yaml")
    with open(filename, 'r') as f:
        response=client.post(url,
            data=dict(
            yaml=f.read()
            )
        )

    data = response.data.decode("utf-8")
    yaml_1_data = json.loads(data)["yamlRegions"]
    

    #switch tab
    url='/api/data/{pid}/{sheet_name}'.format(pid=pid,sheet_name="table-1b")
    response=client.get(url) 

    #load new yaml
    url='/api/yaml/{pid}'.format(pid=pid)
    filename=os.path.join(files_dir, "t2wml", "table-1b.yaml")
    with open(filename, 'r') as f:
        response=client.post(url,
            data=dict(
            yaml=f.read()
            )
        )

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

