import os, shutil, tempfile
import json
from tests.utils import client

#copy files to temp directory
files_dir=os.path.join(os.path.dirname(__file__), "files_for_tests", "suggestion_files")
temp_dir_obj=tempfile.TemporaryDirectory()
temp_dir=temp_dir_obj.name
shutil.copy(os.path.join(files_dir, "project.t2wml"), temp_dir)
shutil.copy(os.path.join(files_dir, "numbers.csv"), temp_dir)

title="numbers_numbers.csv.json"
project_folder=temp_dir
data_file="numbers.csv"
sheet_name="numbers.csv"
url_appendix=f"?project_folder={project_folder}&data_file={data_file}&sheet_name={sheet_name}"

def suggest(client, selection, annotations):
    payload = {"selection": selection, "annotations": annotations}
    url=f"http://localhost:13000//api/annotation/suggest"+url_appendix
    response = client.put(url, json=payload)
    data = response.data.decode("utf-8")
    data = json.loads(data)
    annotations.append(
            {
                "selection":selection,
                "role":data["roles"][0],
                "type": data["types"][0],
                "title": title
            }
            )
    return annotations

def annotate(client, annotations):
    url=f"http://localhost:13000//api/annotation"+url_appendix
    payload={
        "annotations":annotations,
        "title":title
    }
    response = client.post(url, json=payload)
    data = response.data.decode("utf-8")
    data = json.loads(data)
    return data["annotations"], data



def test_one(client):
    #depvar
    selection={"x1":3,"x2":4,"y1":2,"y2":7}
    annotations=suggest(client, selection, [])
    annotations, data=annotate(client, annotations)

    #add property block manually
    annotations.append({"selection":{"x1":3,"x2":4,"y1":1,"y2":1},
        "role":"property"})
    annotations, data=annotate(client, annotations)

    #qualifier
    selection={"x1":2,"x2":2,"y1":2,"y2":7}
    annotations=suggest(client, selection, annotations)
    annotations, data=annotate(client, annotations)

    #qualifier property
    selection={"x1":2,"x2":2,"y1":1,"y2":1}
    annotations=suggest(client, selection, annotations)
    annotations, data=annotate(client, annotations)

    #main subject
    selection={"x1":1,"x2":1,"y1":2,"y2":7}
    annotations=suggest(client, selection, annotations)
    annotations, data=annotate(client, annotations)
    assert data["layers"]["statement"]["entries"][0]["value"]=='10000000'


