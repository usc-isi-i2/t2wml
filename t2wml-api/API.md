# The T2WML API: A programmatic way of using T2WML
* [KnowledgeGraph](#kg)
* [DataSheet and DataFile](#data)
* [CellMapper](#mapper)
   * [Region](#region)
   * [Template](#template)
* [Wikifier](#wikifier)
   * [ItemTable](#itemtable)
* [WikifierService](#wikiservice)
* [The WikidataProvider](#wikiprovider)
* [Convenience Functions](#convenience)
* [Examples of using the API](#examples)


## KnowledgeGraph
<span id="kg"></span>


The KnowledgeGraph class stores the statements generated for a spreadsheet.

It can be created with the class method `generate`, which expects to receive a CellMapper, a DataSheet, and an ItemTable (soon to be Wikifier)

For convenience, it can also be created from files, with the class method `generate_from_files`. This expects to receive one data_file_path (location of the data spreadsheet), one sheet_name, one yaml_file_path (location of the yaml file defining how to build statements), and one wikifier_file_path (location of the wikifier file for creating the item table).

After generation, it contains as properties the `statements`, `metadata`, and `errors` from the generation. The user can examine and process these properties themselves, or they can use KnowledgeGraph's functions to generate 


## Sheet and SpreadsheetFile
<span id="data"></span>

A Sheet is created with a path to a data file and a sheet name. 

For csv files, the sheet name is the same as the file name, so for a file example.csv, the sheet name would also be "example.csv".

A SpreadsheetFile is a convenience class for holding a collection of sheets within one file. IT is initialized with the path to the data file.


## CellMapper
<span id="mapper"></span>

The CellMapper class is responsible for holding the logic for mapping a sheet to a collection of statements. This consists of two parts, the `region` and the `template` properties respectively.

### Region
<span id="region"></span>

The region is an iterator over column+row indices. It must define the function __iter__ which yields (column, row) tuples. The default implementation is created from the region section of the statement mapping in a yaml file.

### Template
<span id="template"></span>

The template class is used to define how to create a statement from a single cell within a sheet. The implementation details are currently too internal to allow easy customizing. It is created from the template section of the statement mapping in a yaml file. 

## Wikifier
<span id="wikifier"></span>

### ItemTable
<span id="itemtable"></span>

## Wikifier
<span id="wikiservice"></span>

You can send a spreadsheet to a wikifier service endpoint and receive back a wikified result.

The service returns a dataframe. The dataframe is created in the wikifier format, with row, column, and value defined. 


## The WikidataProvider
<span id="wikiprovider"></span>
The WikidataProvider class is responsible for providing property types for property IDs and for providing labels and descriptions for item IDs. 

Two already-implemented WikidataProvider classes are provided in t2wml.wikification.wikidata_provider:

1. SparqlProvider- send a sparql query to sparql endpoint. save results in local cache in memory for faster future queries
2. DictionaryProvider- same as SparqlProvider but initialized with a dictionary loaded into cache

All providers inherit from WikidataProvider, which is a template base class.

It has two required functions which *must* be implemented (or an error will be raised)

`get_property_type(self, wikidata_property, *args, **kwargs):`

receives a single wikidata property id and returns the property's type

`def get_labels_and_descriptions(self, items, *args, **kwargs)`

receives a list of item ids, and returns a dictionary, in the form: 
```
{ item_id: {'label': label, 'desc': desc},
  item_id2: {'label': label2, 'desc': desc2}
}
``` 

As well as 4 optional functions:
`save_property(self, property, property_type)`: save property-type pair to whatever source is being used, if relevant. is called by add_properties_from_file, so an error will be raised there if it is not implemented. can also be used in `get_property_type` is the user so desires (for example, SparqlFallback will call this function whenever it had to make a sparql query). 

`save_item(self, item_id, item_dict)`: save item-item dict pair to whatever source is being used, if relevant. can be used in `get_labels_and_descriptions` is the user so desires (for example, SparqlFallback will call this function whenever it had to make a sparql query). 

`def __enter__(self)`: used exclusively with the utility function add_properties_from_file, if there is some setup work that should be done before bulk-adding properties
     
`def __exit__(self, exc_type, exc_value, exc_traceback)`: used exclusively with the utility function add_properties_from_file, if there is some post-processing work that should be done after bulk-adding properties


In addition to WikidataProvider, an additional template class is provided, SparqlFallback, for the common use pattern of "check this data source, and if it's not there, try a sparql query".

It provides its own definitions for `get_property_type` and `get_labels_and_descriptions`. Instead of defining those, the user should define `try_get_property_type` and `try_get_item` (which will be called by get_property_type and get_labels_and_descriptions, and any failures redirected to the sparql querier). Note that `get_item` is singular, ie some items can fail and others succeed, and those that fail then fallback to sparql. 



Examples of creating a custom WikiDataProvider:

```
#initializes from a json dictionary stored in a source file. 
#when calling add properties from file on another file, the contents of that file will be added to the source file

from t2wml.wikification.wikidata_provider import DictionaryProvider
class JsonFileProvider(DictionaryProvider):
    def __init__(self, file_path, sparql_endpoint=None, *args, **kwargs):
        with open(file_path, 'r') as f:
            ref_dict=json.load(f)
        super().__init__(ref_dict, sparql_endpoint)
        self.file_path=file_path
    
    def __exit__(self, exc_type, exc_value, exc_traceback):
        ref_dict_str=json.dumps(self.ref_dict)
        with open(self.file_path, 'w') as f:
            f.write(ref_dict_str)
```

```
# given a database with tables/classes WikidataProperty and WikidataItem:
# this provider will check the database first, and if it doesn't succeed there, it will fall back to a sparql query

from t2wml.wikification.wikidata_provider import FallbackSparql
class DatabaseProvider(FallbackSparql):
    def __init__(self, sparql_endpoint):
        super().__init__(sparql_endpoint)
    
    def save_property(self, wd_property, property_type):
        return WikidataProperty.add_or_update(wd_property, property_type, do_session_commit=False)
    
    def save_item(self, item_id, item_dict):
        WikidataItem.add(item_id, item_dict['label'], item_dict['desc'], do_session_commit=False)
    
    def try_get_property_type(self, wikidata_property, *args, **kwargs):
        prop = WikidataProperty.query.filter_by(wd_id=wikidata_property).first()
        if prop is None:
            raise ValueError("Not found")
        return prop.property_type
    
    def try_get_item(self, item, *args, **kwargs):
        wdi= WikidataItem.query.filter_by(wd_id=item).first()
        return  {'label': wdi.label, 'desc': wdi.description}
    
    def __exit__(self, exc_type, exc_value, exc_traceback):
        try:
            db.session.commit()
        except:
            db.session.rollback()
            raise ValueError("Failed to commit to database session")
```



## Convenience Functions
<span id="convenience"></span>

* `set_wikidata_provider(wikidata_provider)`
* `set_sparql_endpoint(sparql_endpoint)`
* `add_properties(properties_file_path)`
* `create_output_from_files(data_file_path, sheet_name, yaml_file_path, wikifier_filepath, output_filepath=None, output_format="json")`

## Examples of code
<span id="examples"></span>
```
# a script that iterates over a directory of csvs that can all be parsed using the same yaml file
import os
from t2wml.api import save_file, add_properties

properties_file= "custom_properties.json"
add_properties(properties_file)

data_folder="my_drive\my_data"
wikifier_filepath="my_drive\wikiers\wiki.csv"
yaml_filepath="my_drive\yaml1.yaml"
output_folder="my_drive\out"
for file_name in os.listdir(data_folder):
    data_filepath=os.path.join(data_folder, file_name)
    csv_sheet=file_name
    output_filename=os.path.join(output_folder, file_name)
    save_file(data_filepath, csv_sheet, yaml_filepath, wikifier_filepath,
                        output_filename, "tsv", project_name="Example Script")

```