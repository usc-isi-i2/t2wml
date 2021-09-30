# The Backend

The backend is divided into two parts: The server (t2wml-server) and the api (t2wml-api). The API is designed to be used for general scripting, the server contains all the endpoints and some causx-specific functionality.

## Basic overview

T2WML takes a spreadsheet/dataframe (`Sheet`), information about wikification/entities (`ItemTable` + `WikidataProvider`), and directions for how to generate statements (`Annotation` or `Yaml`), and uses these to generate a `KnowledgeGraph` (a collection of "statements"). The KnowledgeGraph can then be used to generate various output formats, like csvs, kgtk files, or fidil jsons, which are all just different ways of expressing the underlying collection of statements.

On top of these base classes, T2WML uses a `Project` class to organize related sheets, wikification information, and statement-generation directions. A project is just a directory containing all relevant folders + a project.t2wml yaml file containing the relationships between the various files and some additional metadata (like the project title). Projects share entity definitions/properties.

Causx currently uses the T2WML project structure. A new project + project directory is created for each session token, so all sessions using the same token will be in the same project. Depending on the final decisions regarding switching to a file-less version, it may be necessary to change this model to something else.

## The basic components

### Spreadsheet

Can be a csv, tsv, or xlsx file. Is saved in the project directory, and loaded as a pandas dataframe.

A dataframe is associated with a spreadsheet filename and a sheet name. In the case of tsv/csv files, which do not have sheet names, the file name is treated as the sheet name as well.

Example:
 * Mydata.xlsx, Sheet1 
 * Mydata.csv, Mydata.csv        

if the app config settings set `USE_CACHE` to `True`: after a sheet is loaded from file, the pandas dataframe is saved as a python pickle object for faster future loads in the app's `CACHE_FOLDER`

### Wikification/Entities

Information about wikification/entities is stored in two files:

1. A wikifier file which maps between cells and IDs. Mapping between a cell and an ID is called "wikification".
2. An entity file which maps between IDs and additional information about the ID, eg label, description, data type, tags.

Each spreadsheet has a separate wikifier file, which lists wikification per cell (row, column, sheet).
Thw wikifier file path is based on the spreadsheet name, and is stored in a sub-directory, `wikifiers`, within the project directory. It is a json file. (In previous versions it was a csv file, and there is still code for backwards compatibility for converting from one to the other)

Entity files are shared between all sheets in the project. Theoretically a project can have many entity files. In causx, it is always `project_entity_file.json` and always located in the top level of the project directory.

There are multiple sections of code devoted to automatically generating wikifier files, and updating entries in the entity file. In the t2wml-server, the module causx/wikification.py attempts to wikify country cells to existing country definitions. Any country cells which fail to be wikified there, as well as all property cells, are sent to the t2wml-api module input_processing/node_creation to have custom nodes created for them. Editing of the created nodes is mostly handled in the t2wml-server causx/causx_utils.py

### File with directions for how to generate statements

Causx exclusively uses annotation files (`.annotation` or `.json`)

These consist of a list of dictionaries. Each dictionary represent a `block`. A block is a rectangular `selection` + information about the selection (role, type, links to other blocks, etc).

Internally, these then get translated into the yaml string equivalent in the t2wml parsing language. Understanding t2wml's yaml format is therefore helpful for understanding more deeply what is going on with the annotations and the constraints being dealt with. The yaml format is documented in the t2wml-api documentation.

Each sheet can be assigned an annotation file (actually, each sheet can be assigned multiple annotation files, but there isn't frontend support for this yet).

Within t2wml-api, there is one module for creating a suggested annotation from a spreadsheet (input_processing/annotation_suggesting) and another module for translating annotation files to t2wml-compatible yaml files (input_processing/annotation_parsing). 


## Putting it all together

Given a spreadsheet, the pipeline is:
* Stage one: suggested annotation -> node creation -> any additional annotating -> additional node creation.
* Stage two: annotation parsing -> knowledge graph generation -> creating output in a specific output format.

(in practice, the annotation parsing -> output steps are repeated to create the preview during each step of stage one, but only on a selection of cells rather than the entire sheet)

### Uploading a file

