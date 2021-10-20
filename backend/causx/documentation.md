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

if the app config settings set `USE_CACHE` to `True`: after a sheet is loaded from file, the pandas dataframe is saved as a python pickle object for faster future loads in the app's DATA_DIR in folder 'cache'

### Wikification/Entities

Information about wikification/entities is stored in two files:

1. A wikifier file which maps between cells and IDs. Mapping between a cell and an ID is called "wikification".
2. An entity file which maps between IDs and additional information about the ID, eg label, description, data type, tags.

Each spreadsheet has a separate wikifier file, which lists wikification per cell (row, column, sheet).
Thw wikifier file path is based on the spreadsheet name, and is stored in a sub-directory, `wikifiers`, within the project directory. It is a json file. (In previous versions it was a csv file, and there is still code for backwards compatibility for converting from one to the other)

Entity files are shared between all sheets in the project. Theoretically a project can have many entity files. In causx, it is always `project_entity_file.json` and always located in the top level of the project directory. (Please note that the property entries in this dictionary have a field "url". In causx this field is always empty)

There are multiple sections of code devoted to automatically generating wikifier files, and updating entries in the entity file. In the t2wml-server, the module causx/wikification.py attempts to wikify country cells to existing country definitions. Any country cells which fail to be wikified there, as well as all property cells, are sent to the t2wml-api module input_processing/node_creation to have custom nodes created for them. Editing of the created nodes is mostly handled in the t2wml-server causx/causx_utils.py

### File with directions for how to generate statements

Causx exclusively uses annotation files (`.annotation` or `.json`)

These consist of a list of dictionaries. Each dictionary represent a `block`. A block is a rectangular `selection` + information about the selection (role, type, links to other blocks, etc).

Internally, these then get translated into the yaml string equivalent in the t2wml parsing language. Understanding t2wml's yaml format is therefore helpful for understanding more deeply what is going on with the annotations and the constraints being dealt with. The yaml format is documented in the t2wml-api documentation.

Each sheet can be assigned an annotation file (actually, each sheet can be assigned multiple annotation files, but there isn't frontend support for this yet).

Within t2wml-api, there is one module for creating a suggested annotation from a spreadsheet (input_processing/annotation_suggesting) and another module for translating annotation files to t2wml-compatible yaml files (input_processing/annotation_parsing). 


### Putting it all together

Given a spreadsheet, the pipeline is:
* Stage one: suggested annotation -> node creation -> any additional annotating -> additional node creation.
* Stage two: annotation parsing -> knowledge graph generation -> creating output in a specific output format.

(in practice, the annotation parsing -> output steps are repeated to create the preview during each step of stage one, but only on a selection of cells rather than the entire sheet)

## How the data flows through the system

### Additional data classes

In the t2wml-server, there are an additional two classes aside from those already discussed above

The first is `CalcParams`: 

The CalcParams class holds all the information related to a given request to pass between the various functions. It holds a reference to the current project, the selected data file and sheet, the selected annotation file, as well as the optional parameters specifying start and end rows of what to fetch. It handles fetching the Wikifier class (wrapper for ItemTable) for the given sheet.

A CalcParams instance is created for almost every request (except some that don't do any calculation) and then passed as an argument to subsequent functions.

The second is the `WebDictionaryProvider`. This is the web-specific child class of `WikidataProvider`. It loads the contents of `project_entity_file.json` and also has access to a preloaded list of all wikidata properties (in the case of causx this really only relevant for "P585"), as well as preloaded countries.

As a result of problems with the entity dictionary not updating as expected between requests, right now the WebDictionaryProvider is reloaded from file for every single request.

The WebDictionaryProvider instance is saved to a global dictionary in the t2wml-api (`t2wml_settings`) and is accessed by functions in the t2wml-api via import. **This has the potential to cause issues when multiple users are accessing the backend at the same time**

### Setting up a request

When any request except `is-alive` and GET `token` is received, the first step is getting the `Project` instance, using the token in the Authentication header. If a project directory hasn't yet been created for that token, it is created at this point. This is also when the `WebDictionary` instance is set up and passed to the t2wml-api global variable. 

After getting the project instance, the next step for most requests is creating the `CalcParams` object for that request, using the fetched project as well as parameters passed in the request url like `data_file`, `sheet_name`, and range arguments. For now, because causx supports only one annotation per sheet, the annotation file name is automatically generated from the datafile/sheet names, and does not need to be passed as a parameter. (if support for multiple annotations on a sheet is added this will need to be changed to match the non-causx backend) 

### Full description of flow through the basic functions

##### Part One: Setting up the annotation

1. `api/causx/token` - gets the session token for the project
2. `api/causx/upload/data` - uploads the data file. **this is likely to be replaced by api/causx/upload/spreadsheet**, as we add support for multiple sheets/files
    - saves the file to the filesystem **will need to be changed if we are working without filesysten**
    - adds it to the project's t2wml.project file
    - sends back the file parameters to be used for future requests as well as some of the rows from the table for display
3. `/api/causx/annotation/guess-blocks`
    - sends the CalcParams object with the file paramters to the block_finder function in the t2wml-api
    - saves the annotations to the annotation file **right now it does not also save to project, because, as noted above, with only single-annotation support, it is sufficient to have it match the sheet name. this is important to change if multi-annotation support is added**
    - returns the annotations (a json dictionary). It also currently returns `yamlContent`, **this should be removed as it is irrelevant to causx**
4. upon receiving the annotation from guess-blocks the frontend triggers a request to `api/causx/partialcsv`,
which produces a preview of the results - we'll discuss this more in part three
5. `api/causx/wikify_region`- wikifies the countries. (this is also auto-triggered by the frontend from suggest-annotations. It should also be triggered when selecting a subject region manually, or when selecting a qualifier whose type is country-- **the latter appears not to be implemented yet**)
    - sends a selection of cells and the CalcParams object to the wikify_countries function
    - wikify_countries returns a pandas dataframe
    - this is then added to the project's wikifier file for that data file.
    - additional custom nodes are created for any cells that failed to wikify for a country
    - these, too, are then added to the project's wikifier file for that data file. they are also added to the WebDictionaryProvider
    - the CalcParams object is recreated so its wikifier won't be out of date (**this step may not be necessary**)
    - a response is returned with the updated wikification (qnodes layer) information for the spreadsheet
6. `/api/causx/annotation`  - at this point it is necessary to add a property, because properties are not auto-suggested. This endpoint saves the annotation to a file and adds it to the project. This same endpoint is used for any additional annotations added or edited, eg adding a qualifier.
7. `/api/causx/auto_wikinodes` - triggered by the frontend. creates custom nodes for properties, which are then added to the project's wikifier file for that data file. they are also added to the WebDictionaryProvider.
8. repeat steps 6-7 as necessary
    
##### Optional: Editing properties, project settings, etc

1. `api/causx/entity/<entity-id>` - allows editing a property's fields. In causx this is mostly editing tags. **(currently for some reason it is not possible to edit properties attached directly to a block without a property block of their own, this is a frontend issue not a backend one)**
    - property fields are stored in `project_entity_file.json` and loaded into the WebDictionaryProvider with each request. 
    - the endpoint edits the file to include any updated fields as well as updating WebDictionaryProvider
    - it returns the qnode layer
2. `api/causx/project/settings` - allows editing the project's title, description, and data source url

Note that all requests returning the qnode layer include an additional step of fetching any tags available from the `project_entity_file.json`


##### Part Two: Getting the output

One of the download options is not like the others = Saved project (.t2wmlz) saves the project state and its files and returns them as a zipped folder.

The other three options:

`/api/causx/download_zip_results`
`/api/causx/project/fidil_json`
`/api/causx/project/download/tsv`

All do the same basic pathway:

1. using the `CalcParams` instance, create a `KnowledgeGraph`
2. Using the statements from the KnowledgeGraph, create the output in the desired format

The only variation is the code for creating the format.

