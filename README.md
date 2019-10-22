# T2WML: A Cell-Based Language To Map Tables Into Wikidata Records

## Installation

1. Clone the repository
2. Open terminal/cmd in the project directory and type the following commands:
    ```sh
    pip install -r requirements.txt
    python -m spacy download en_core_web_sm
    python application.py
    ```
3. Server is up and running

## Usage Within Code
```
from driver import run_t2wml
run_t2wml(data_file_path,  wikified_output_path, t2wml_spec, output_directory, sheet_name, sparql_endpoint)
```
Arguments:
```
Mandatory Arguments:
    data_file_path: string
    wikified_output_path: string 
    t2wml_spec: string
    output_directory: string 
Optional Arguments:
    sheet_name: string
    sparql_endpoint: string
```

Default Values:
``` 
    sparql_endpoint = "http://dsbox02.isi.edu:8888/bigdata/namespace/wdq/sparql"
```
Output:

The function will create a directory structure in the output directory which will have the results.ttl and changes.tsv files.

Output Directory Structure:
```
output_directory/
├── excel_file_name/
│   └── sheet_name/
|       ├── results.ttl
|       └── changes.tsv
└── csv_file_name/
    ├── results.ttl
    └── changes.tsv
```

## Usage with GUI

Once the server is set up, the GUI should run at the following port by default:
```
http://localhost:5000/
```

1. Open the GUI
2. In **Table Viewer**,
	1. click **Upload** to open a table file (.csv/.xls/.xlsx)
3. In **Wikifier**,
	1. define and wikify the regions you need [[demo](#wikify_region)], and/or
	2. click **Upload** to open a wikifier file (.csv)
	3. correct mismatched qnode if necessary [[demo](#modify_qnode)]
4. In **YAML Editor**,
	1. type/paste in T2WML code, or
	2. click **Upload** to open a YAML file (.yaml)
	3. click **Apply** to highlight some regions in **Table Viewer**
5. In **Output**,
	1. preview result by clicking cell in **Table Viewer** [[demo](#preview_result)], or
	2. click **Download** to get all results

## Features

> Note: All screenshots below are captured in GUI v1.3. Minor inconsistency may appear.

<span id="wikify_region"></span>⬇️ Wikify region
![t2wml-gui-demo](demo/t2wml-gui-v1.3-wikifier_add.gif)

<span id="modify_qnode"></span>⬇️ Modify qnode
![t2wml-gui-demo](demo/t2wml-gui-v1.3-wikifier_update.gif)

<span id="preview_result"></span>⬇️ Preview result
![t2wml-gui-demo](demo/t2wml-gui-v1.3-output.gif)

## FAQs

* **Python package problems related with `etk`?**

	Please do not use `pip install etk`.
	
	Usually `pip uninstall etk` and redo from `pip install -r requirements.txt` would solve this issue.

* **Login failed or Google said `Error 400 (OAuth2 Error)`?**

	Please do not use `http://127.0.0.1:5000/`.
	
	Instead, use `http://localhost:5000/`.
