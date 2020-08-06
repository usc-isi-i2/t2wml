# T2WML: A Cell-Based Language To Map Tables Into Wikidata Records

* [Running the T2WML standalone local server](#server)
* [Running T2WML for development](#development)
* [Usage with GUI](#usage_with_gui)
* [Writing T2WML](#writing_t2wml)
* [Features](#features)
* [FAQs](#faqs)

<table>
  <tr><td><b>Operating system:</b></td><td>macOS / OS X, Linux, Windows</td></tr>
  <tr><td><b>Python version:</b></td><td>Python 3.6+</td></tr>
</table>

This is the repository for the T2WMl server-based GUI. You may be looking for the [T2WML API](https://github.com/usc-isi-i2/t2wml-api)


## Running the T2WML standalone local server
<span id="server"></span>

A locally hosted web GUI version of t2wml can be installed quickly using pip

1. make a fresh virtual environment
2. `pip install --extra-index-url https://pypi.fury.io/theresearchsoftwarecompany/ t2wml-standalone==2.0a17`
3. run `t2wml-server`
4. navigate to [`http://localhost:13000/`](http://localhost:13000/) in a Chrome browser



## Running T2WML for development
<span id="development"></span>

1. Clone the t2wml-api repository
```
git clone https://github.com/usc-isi-i2/t2wml-api
cd t2wml-api
git checkout development
```

2. Clone the GUI repository
```
cd ..
git clone https://github.com/usc-isi-i2/t2wml
cd t2wml
git checkout development
```

3. Create a virtual environment for the GUI repository (python 3.6 and 3.7 are supported)

example: 

```
python3.6 -m venv t2wml_env
source t2wml_evn/bin/activate
pip install --upgrade pip
```

3. Install the t2wml API in editable mode from the clone repo using the path to the folder:

    `pip install -e ../t2wml-api`

4. Install the remaining requirements from server/requirements.txt
   `pip install -r server/requirements.txt`
   
   Optional: You can install the optional package `etk`.

	```
	pip install etk
	pip install https://github.com/explosion/spacy-models/releases/download/en_core_web_sm-2.2.5/en_core_web_sm-2.2.5.tar.gz
	```
5. In the folder server/backend, run the backend server: 

```
cd server/backend
python application.py
```

6. In a new terminal, navigate to GUI repository clone.
   Install the frontend requirements. You will need to have the package manager `yarn` installed:

```
cd server/frontend
yarn install
```

8. Run the frontend server: 

```
yarn start
```

The backend will be running on port 13000, and the frontend on port 3000. Navigate to [`http://localhost:3000/`](http://localhost:3000/) on a Chrome browser to begin using.

The repo also contains vscode configurations for the convenience of those working in VS Code.




## Usage with GUI
<span id="usage_with_gui"></span>

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



## Writing T2WML
<span id="writing_t2wml"></span>

Check out the [grammar guide](docs/grammar.md)


## Features
<span id="features"></span>

> Note: All screenshots below are captured in GUI v1.3. Minor inconsistencies may appear.

<span id="wikify_region"></span>⬇️ Wikify region
![t2wml-gui-demo](docs/demo/t2wml-gui-v1.3-wikifier_add.gif)

<span id="modify_qnode"></span>⬇️ Modify qnode
![t2wml-gui-demo](docs/demo/t2wml-gui-v1.3-wikifier_update.gif)

<span id="preview_result"></span>⬇️ Preview result
![t2wml-gui-demo](docs/demo/t2wml-gui-v1.3-output.gif)


## FAQs
<span id="faqs"></span>

* **Installation failed due to `etk`?**

    Run the following commands in terminal/cmd:
    ```
    pip uninstall etk
    pip install https://github.com/usc-isi-i2/etk/archive/development.zip
    ```

* **Login failed or encountered an authentication error like `400 (OAuth2 Error)`?**
  
    Access T2WML at `http://localhost:13000/` instead of `http://127.0.0.1:13000`.

* **Error saying can't find static/index.html?**
  
    Make sure you install t2wml-standalone in a folder that does not contain the T2WML repo or there will be a configurations clash.

* **Encountered any other error not mentioned in the FAQs?**
  
    Post the issue in the T2WML repository along with a detailed description.
