# T2WML: A Cell-Based Language To Map Tables Into Wikidata Records

### Installation:
1. Clone the repository
2. Open terminal/cmd in the project directory and type the following commands:
    ```sh
    pip install -r requirements.txt
    python -m spacy download en_core_web_sm
    python application.py
    ```
3. Server is up and running

### GUI Usage
Once the server is set up, the GUI should run at `http://localhost:5000/` by default
1. Open the GUI
2. Click `Open` of `Table Viewer` to upload a table file (.csv/.xls/.xlsx)
3. Click `Open` of `YAML Editor` to upload a YAML file (.yaml) or just type/paste in YAML code
4. Click `Apply` of `YAML Editor`, and you'll see some regions in `Table Viewer` are highlighted
5. Click cells in `Table Viewer`, and you'll see results in `Output`
![t2wml-gui-demo](t2wml-gui-demo.gif)
