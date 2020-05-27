# T2WML: A Cell-Based Language To Map Tables Into Wikidata Records

* [Installing the server using pip](#serverinstall)
* [Running T2WML for development](#development)
* [Usage Within Code](#usage_within_code)
* [Usage with GUI](#usage_with_gui)
* [Features](#features)
* [FAQs](#faqs)

<table>
  <tr><td><b>Operating system:</b></td><td>macOS / OS X, Linux, Windows</td></tr>
  <tr><td><b>Python version:</b></td><td>Python 3.6+</td></tr>
</table>

<span id="serverinstall"></span>
## Installing the server with pip

A locally hosted web GUI version of t2wml can be installed quickly using pip

1. make a fresh virtual environment
2. `pip install --extra-index-url https://pypi.fury.io/theresearchsoftwarecompany/ t2wml-standalone==2.0a6`
3. run `t2wml-server`
4. navigate to [`http://localhost:5000/`](http://localhost:5000/) in a Chrome browser

<span id="development"></span>
## Running T2WML for development

1. Clone the repository
2. Install the python requirements
	`pip install -r requirements.txt`
	
	On Windows you may encounter an error saying that `etk.wikidata` cannot be imported when you run the backend.
    If you encounter it, run:

    `pip install --force-reinstall etk`
3. Run the backend server: 
    `python application.py`
4. Install the frontend requirements:
   In the folder "frontend", run `npm install`
5. Run the frontend server: 
   In the folder "frontend", run `npm run start`

The backend will be running on port 5000, and the frontend on port 3000. Navigate to [`http://localhost:3000/`](http://localhost:3000/) on a Chrome browser to begin using.



<span id="usage_within_code"></span>
## Usage Within Code

For now, using within code requires running from the repo (not via pip install). It is not necessary to follow the steps for installing the frontend, only the backend.

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
    sparql_endpoint = "https://dsbox02.isi.edu:8888/bigdata/namespace/wdq/sparql"
```

> Edit in [/app_config.py](https://github.com/usc-isi-i2/t2wml/blob/master/app_config.py)

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

<span id="usage_with_gui"></span>
## Usage with GUI

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

<span id="features"></span>
## Features

> Note: All screenshots below are captured in GUI v1.3. Minor inconsistencies may appear.

<span id="wikify_region"></span>⬇️ Wikify region
![t2wml-gui-demo](demo/t2wml-gui-v1.3-wikifier_add.gif)

<span id="modify_qnode"></span>⬇️ Modify qnode
![t2wml-gui-demo](demo/t2wml-gui-v1.3-wikifier_update.gif)

<span id="preview_result"></span>⬇️ Preview result
![t2wml-gui-demo](demo/t2wml-gui-v1.3-output.gif)

<span id="faqs"></span>
## FAQs

* **Installation failed due to `etk`?**

    Run the following commands in terminal/cmd:
    ```
    pip uninstall etk
    pip install https://github.com/usc-isi-i2/etk/archive/development.zip
    ```

* **Login failed or encountered an authentication error like `400 (OAuth2 Error)`?**
  
    Access T2WML at `http://localhost:5000/` instead of `http://127.0.0.1:5000`.

* **Error saying can't find static/index.html?**
  
    Make sure you install t2wml-standalone in a folder that does not contain the T2WML repo or there will be a configurations clash.

* **Encountered any other error not mentioned in the FAQs?**
  
    Post the issue in the T2WML repository along with a detailed description.
