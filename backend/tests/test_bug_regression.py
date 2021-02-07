import os
import json
from tests.utils import (client, get_yaml_calculation, load_yaml_file)


def test_empty_cells(client):
    #the bug is described in issue 153
    files_dir=os.path.join(os.path.dirname(__file__), "files_for_tests", "empty_cells")

    #change project settings
    url='/api/project/settings?project_folder={path}'.format(path=files_dir)
    response=client.put(url,
            json=dict(
            warnEmpty=False
        ))

    #get project results
    data= get_yaml_calculation(client, files_dir, "fertilizer.xlsx", "Sheet1", "t2wml.yaml")

    #change project settings
    url='/api/project/settings?project_folder={path}'.format(path=files_dir)
    response=client.put(url,
            json=dict(
            warnEmpty=True
        ))

    #reapply yaml:
    response=load_yaml_file(client, files_dir, os.path.join(files_dir, "t2wml.yaml"),  "fertilizer.xlsx", "Sheet1")
    data2 = response.data.decode("utf-8")
    data2 = json.loads(data2)

    error_cells_1=data["layers"]["error"]
    error_cells_2=data2["layers"]["error"]
    assert error_cells_1!=error_cells_2
