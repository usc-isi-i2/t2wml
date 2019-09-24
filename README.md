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

## GUI Usage

Once the server is set up, the GUI should run at the following port by default:
```
http://localhost:5000/
```

1. Open the GUI
2. In **Table Viewer**,
	1. click **Open** to upload a table file (.csv/.xls/.xlsx)
3. In **Wikifier**,
	1. define and wikify the regions you need [[demo](#wikify_region)], and/or
	2. click **Open** to upload a wikifier file (.csv)
	3. correct mismatched qnode if necessary [[demo](#modify_qnode)]
4. In **YAML Editor**,
	1. type/paste in T2WML code, or
	2. click **Open** to upload a YAML file (.yaml)
	3. click **Apply** to highlight some regions in **Table Viewer**
5. In **Output**,
	1. preview result by clicking cell in **Table Viewer** [[demo](#preview_result)], or
	2. click **Download** to get all results

## Features

<span id="wikify_region"></span>⬇️ Wikify region
![t2wml-gui-demo](demo/t2wml-gui-v1.3-wikifier_add.gif)

<span id="modify_qnode"></span>⬇️ Modify qnode
![t2wml-gui-demo](demo/t2wml-gui-v1.3-wikifier_update.gif)

<span id="preview_result"></span>⬇️ Preview result
![t2wml-gui-demo](demo/t2wml-gui-v1.3-output.gif)
