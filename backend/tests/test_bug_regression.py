import os
import json
from tests.utils import (client, create_project, load_data_file, load_yaml_file, 
                        load_wikifier_file, get_project_files)


def test_empty_cells(client):
    #the bug is described in issue 153
    files_dir=os.path.join(os.path.dirname(__file__), "files_for_tests", "empty_cells")

    #change project settings
    url='/api/project/settings?project_folder={path}'.format(path=files_dir)
    response=client.put(url,
            data=dict(
            warnEmpty=False
        )) 

    #get project results
    data= get_project_files(client, files_dir)

    #change project settings
    url='/api/project/settings?project_folder={path}'.format(path=files_dir)
    response=client.put(url,
            data=dict(
            warnEmpty=True
        )) 
    
    #reapply yaml:
    response=load_yaml_file(client, files_dir, filename=os.path.join(files_dir, "t2wml.yaml"), sheet_name="Sheet1")
    data2 = response.data.decode("utf-8")
    data2 = json.loads(data2)

    #once again, this is cheating
    error_cells_1=data["layers"]["type"]["entries"][4]["indices"]
    error_cells_2=data2["layers"]["type"]["entries"][4]["indices"]
    assert error_cells_1!=error_cells_2