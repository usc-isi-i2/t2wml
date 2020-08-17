# T2WML: A Cell-Based Language To Map Tables Into Wikidata Records

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



## Running T2WML for development
<span id="development"></span>  

### Setup
1. Setting up the sources

For developing t2wml you need both the t2wml-api repository and the t2wml (this) repository.
Create a directory called `t2wml-root` and clone both repositories under it:

```
cd t2wml-root
git clone https://github.com/usc-isi-i2/t2wml-api
cd t2wml-api
git checkout development
```

```
cd t2wml-root
git clone https://github.com/usc-isi-i2/t2wml
cd t2wml
git checkout development
```

2. Set up the React frontend

First you have to make sure you have Node version 12 or higher installed.

```
cd t2wml-root/t2wml/frontend
yarn install
```

(Note - there is a current issue with using npm. Use yarn for now)

3. Create a virtual environment (python 3.6 and higher are supported)

```
cd t2wml-root/t2wml/backend
python3.6 -m venv env
source env/bin/activate     # on Windows just run env/bin/activate.ps1
pip install --upgrade pip
pip install -e ../../t2wml-api   # Install t2wml-api from the cloned repository at t2wml-root/t2wml-api
pip install -r requirements.txt
```


### Running the server from the shell

1. Running the backend server:

```
cd t2wml-root/t2wml/backend
python t2wml-server.py
```

2. Running the frontend GUI

```
cd t2wml-root/t2wml/frontend
yarn start
```

The backend will be running on port 13000, and the frontend on port 3000. Navigate to [`http://localhost:3000/`](http://localhost:3000/) on a Chrome browser to begin using.

### Running from Visual Studio Code
The project has preconfigured settings file for Visual Studio Code. Before starting you need to copy the settings template appropriate for your OS.

On Macs and Linux machines, copy `.vscode/settings.linux.json` to `.vscode/settings.json` . On Windows, copy `.vscode/settings.windows.json` to `.vscode/settings.json`
Start Visual Studio Code and open it in the t2wml-root/t2wml directory.

You can run the backend with F5 (choose the "Backend" launch configuration). To run the Frontend, choose Terminal | Run Task | npm: start - frontend .


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
