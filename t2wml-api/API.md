# The T2WML API: A programmatic way of using T2WML
* [Examples of using the API](#examples)
* [Convenience Functions](#convenience)
* [KnowledgeGraph](#kg)
* [SpreadsheetFile and Sheet](#sheet)
* [Wikifier](#wikifier)
* [WikifierService](#wikifierservice)
* [StatementMapper](#statementmapper)
  * [YamlMapper](#yamlmapper)
  * [A custom mapper class](#custommapper)
* [The WikidataProvider](#wikiprovider)




## Examples of code
<span id="examples"></span>

**Example one: Using the API's convenience functions**

```
# a script that iterates over a directory of csvs that can all be parsed using the same yaml file
import os
from pathlib import Path
from t2wml.api import create_output_from_files, add_properties_from_file

properties_file= "custom_properties.json"
add_properties_from_file(properties_file)

data_folder="my_drive\my_data"
wikifier_filepath="my_drive\wikiers\wiki.csv"
yaml_filepath="my_drive\yaml1.yaml"
output_folder="my_drive\out"
for file_name in os.listdir(data_folder):
    data_filepath=os.path.join(data_folder, file_name)
    csv_sheet=file_name
    output_filename=os.path.join(output_folder, Path(file_name).stem+".tsv")
    create_output_from_files(data_filepath, csv_sheet, yaml_filepath, wikifier_filepath,     output_filename, output_format="kgtk")

```

**Example two: Using the API's classes**

```
#a script that iterates over the sheets of a single excel file that can all be parsed with the same yaml file
from t2wml.api import KnowledgeGraph, Wikifier, YamlMapper, SpreadsheetFile
data_file="my_drive\my_data\mydata.xlsx"
wikifier_filepath1="my_drive\wikiers\wiki.csv"
wikifier_filepath2="my_drive\wikiers\wiki2.csv"
yaml_filepath="my_drive\yaml1.yaml"
output_folder="my_drive\out"

yaml_mapper=YamlMapper(yaml_filepath)
wikifier=Wikifier()
wikifier.add_file(wikifier_filepath1)
wikifier.add_file(wikifier_filepath2)
spreadsheet_file=SpreadsheetFile(data_file)
for sheet_name, sheet in spreadsheet_file.items():
    print("processing sheet "+sheet_name)
    sheet=spreadsheet_file[sheet_name]
    kg=KnowledgeGraph.generate(yaml_mapper, sheet, wikifier)
    out_filepath=sheet_name+".tsv"
    kg.save_kgtk(out_filepath)
```

## Convenience Functions
<span id="convenience"></span>

* `set_wikidata_provider(wikidata_provider)`: set the wikidata provider for t2wml to the provided argument (should be an initialized class instance)
* `set_sparql_endpoint(sparql_endpoint)`: set the sparql endpoint used throughout the code for wikidata queries
* `add_properties_from_file(properties_file_path)`: add properties to the wikidata provider from the provided file path, which must be in json or kgtk format
* `create_output_from_files(data_file_path, sheet_name, yaml_file_path, wikifier_filepath, output_filepath=None, output_format="json")`: 


## KnowledgeGraph
<span id="kg"></span>


The KnowledgeGraph class stores the statements generated for a spreadsheet.

It can be created with the class method `generate`, which expects to receive a StatementMapper, a Sheet, and a Wikifier

For convenience, it can also be created from files, with the class method `generate_from_files`. This expects to receive one data_file_path (location of the data spreadsheet), one sheet_name, one yaml_file_path (location of the yaml file defining how to build statements), and one wikifier_file_path (location of the wikifier file for creating the item table).

After generation, it contains as properties the `statements`, `metadata`, and `errors` from the generation. The user can examine and process these properties themselves, or they can use KnowledgeGraph's functions to generate 


## Sheet and SpreadsheetFile
<span id="sheet"></span>

A Sheet is created with a path to a data file and a sheet name. 

For csv files, the sheet name is the same as the file name, so for a file example.csv, the sheet name would also be "example.csv".

A SpreadsheetFile is a convenience class for holding a collection of sheets within one file. It is initialized with the path to the data file. It inherits from immutable Mapping/Dictionary and therefore all mapping methods (len, get, keys, items, indexing, iteration) are available on it. The keys are the sheet names and the values are the sheets.


## Wikifier
<span id="wikifier"></span>

A wikifier is created without any starting arguments.

Thereafter, wikification information can be added to the wikifier with either the `add_file` or `add_dataframe` functions. The file must be a csv file. Both file and dataframes are expected to have 
"column", "row", "value", "context", and "item" columns defined. (other than "item", the columns can be empty, although it is not valid for column AND row AND value to be empty simultaneously for a given row)

Adding wikification information is order-sensitive, because later additions will overwrite earlier ones. A message to the user will be printed when this occurs.

A wikifier can be saved to a file with the function `save(filename)` and then loaded from that file with `load(filename)`

The wikifier keeps track of the filepaths of any files added with add_file, and keeps a list of all of its dataframes (those loaded from a file and those loaded directly). A small convenience function for printing out information about the wikifier is included, `print_data`.

Internally, the wikifier creates an ItemTable, for looking up items by string or by cell, and is used extensively in creating statements.

Example code:

```
    import pandas as pd
    from t2wml.api import Wikifier
    wikifier_file="my_wikifier.csv"
    wf = Wikifier()
    wf.add_file(wikifier_file)
    df=pd.DataFrame.from_dict({"column":[''], "row":[''], "value":'Burundi', "item":['Q99'], "context":['']})
    wf.add_dataframe(df)
    wf.save(r"wiki_save")
    new_wf=Wikifier.load(r"wiki_save")
    new_wf.print_data()
```

> Wikifier update overwrote existing values: {"('', '', 'Burundi')": 'Q967'}
> The wikifier contains 1 wiki files, and a total of 2 dataframes
> The files are: my_wikifier.csv



## WikifierService
<span id="wikifierservice"></span>

You can send a spreadsheet, a region, and optionally a context to a wikifier service for wikification,  and receive back a wikified dataframe plus a list of any cells that were not successfully wikified. 

The wikifier service has a default endpoint but a different one can be set, as long as the endpoint in question knows how to receive wikification requests. (standardizing the API for this is a work in progress that has not yet been completed)

The service returns a dataframe. This dataframe can be loaded into the Wikifier class with the Wikifier's function `add_dataframe`.

Example code:

```
from t2wml.api import WikifierService, Sheet, Wikifier
ws=WikifierService()
sheet=Sheet("mydata.xlsx", "sheet2")
df, problem_cells= ws.wikify_region("A4:B7", sheet, "from wikifier service")
wf=Wikifier()
wf.add_dataframe(df)
```


## StatementMapper
<span id="statementmapper"></span>

A StatementMapper is a class responsible for holding the logic for creating statements, metadata, and error reports from a Sheet plus Wikifier. 

All StatementMappers should implement the base template BaseStatementMapper, which defines the public interface of the class:

* `get_cell_statement(self, sheet, wikifier, col, row, do_init=True)`: returns statement, errors. Must be defined by inheriting classes.
* `iterator(self)`: yields col, row pairs. Must be defined by inheriting classes.
* `get_all_statements(self, sheet, wikifier)`: returns statements, cell_errors, metadata. By default calls `get_cell_statement` in a loop using `iterator`. Does not need to be redefined unless user wants to customize something specific.
* `do_init(self, sheet, wikifier)`: optional. used for any initalization needed before running get_cell_statement or get_all_statements. the argument `do_init=True` in get_cell_statement allows skipping the init function if calling from get_all_statements (it is set to false in get_all_statements). Other than passing sheet and wikifier, any other arguments needed for do_init would need to be set as properties of self and then accessed.

a `statement` is a dictionary representation of the statement for a cell. It must define `item`, `property`, and `value`, and can also define a list of qualifiers (`qualifier`) and a list of references (`reference`), as well as any additional optional keys such as `unit`. 

Example statement:

```
{
    "item": "Q190",
    "value": 3,
    "property": "P123",
    "qualifier": [
        {"property": "P333", "value":7}
    ]
}
```

`error` is a dictionary, containing information about any errors that occured while processing the cell, matched to the key of the error's location in the result statement. For example, if the cell attempts to set a value for item that is invalid, error should contain "item":error message. If the property of a qualifier is invalid, that would be "qualifier":{index:{"property":error message}}

Example error:

```
{
    "item": "Not found",
    "qualifier": [
        2: {
            "property": invalid date format
        }
    ]
}
```

error can also be returned as simply an empty dictionary, or the user can choose to raise Exceptions and abort the process instead of handling returning errors. 

`statements` is simply a dictionary of `statement`s, where the keys are excel-style cell identifiers (eg "A5")

`errors`, like `statements`, is simply a dictionary of `error`s with cells as keys. 

`metadata` is a dictionary. It ideally should define "data_file" (the name of the file we are processing) and "sheet_name" (the name of the sheet in that file we are processing). These keys are used when generating IDs for the kgtk format, and without them, the IDs may not be unique. It can also define "created_by" (used when generating ttl files). Any other information the user feels interested in preserving can also be stuck here. However, the code will continue to work even if an empty dictionary is returned.

### The YamlMapper
<span id="yamlmapper"></span>

The T2WML API already contains a fully implemented version of this class, the YamlMapper. 

It is initialized with the path to a yaml file that conforms to the standards described in the [grammar documentation](..\docs\grammar.md)

Example usage:

```
from t2wml import KnowledgeGraph, YamlMapper, Wikifier, Sheet

ym=YamlMapper("template.yaml")
sh=Sheet("datafile.csv", "datafile.csv")
wf=Wikifier()
wf.add_file("mywikifier.csv")
kg=KnowledgeGraph.generate(ym, sh, wf)
```

### A custom StatementMapper class
<span id="custommapper"></span>

Here's a simple custom StatementMapper class, for a sheet where the item is always next to the value and the property is a known constant. 

```
from t2wml.mapping.statement_mapper import BaseStatementMapper

class SimpleSheetMapper(BaseStatementMapper):
    def __init__(self, cols, rows):
        self.cols=cols
        self.rows=rows
    def iterator(self):
        for col in self.cols:
            for row in self.rows:
                yield(col, row)
    def get_cell_statement(self, sheet, wikifier, col, row, *args, **kwargs):
        error={}
        statement={}
        try:
            item=wikifier.item_table.get_item(col-1, row)
            statement["item"]=item
        except Exception as e:
            error["item"]=str(e)
        
        try:
            value=sheet[col, row]
            statement["value"]=value
        except Exception as e:
            error["value"]=str(e)
        
        statement["property"]="P123"
        
        return statement, error

```


## The WikidataProvider
<span id="wikiprovider"></span>
The WikidataProvider class is responsible for providing property types for property IDs and for providing labels and descriptions for item IDs. 

Two already-implemented WikidataProvider classes are provided in t2wml.api:

1. SparqlProvider- send a sparql query to sparql endpoint. save results in local cache in memory for faster future queries
2. DictionaryProvider- same as SparqlProvider but initialized with a dictionary loaded into cache

All providers inherit from WikidataProvider, which is a template base class.

It has one required function which *must* be implemented (or an error will be raised)

`get_property_type(self, wikidata_property, *args, **kwargs):`

receives a single wikidata property id and returns the property's type


As well as 4 optional functions:
`save_property(self, property, property_type)`: save property-type pair to whatever source is being used, if relevant. is called by add_properties_from_file, so an error will be raised there if it is not implemented. can also be used in `get_property_type` is the user so desires (for example, SparqlFallback will call this function whenever it had to make a sparql query). 

`def __enter__(self)`: used exclusively with the utility function add_properties_from_file, if there is some setup work that should be done before bulk-adding properties
     
`def __exit__(self, exc_type, exc_value, exc_traceback)`: used exclusively with the utility function add_properties_from_file, if there is some post-processing work that should be done after bulk-adding properties


In addition to WikidataProvider, an additional template class is provided, SparqlFallback, for the common use pattern of "check this data source, and if it's not there, try a sparql query".

It provides its own definitions for `get_property_type`. Instead of defining that, the user should define `try_get_property_type` (which will be called by get_property_type, and any failures redirected to the sparql querier).



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
    
    def try_get_property_type(self, wikidata_property, *args, **kwargs):
        prop = WikidataProperty.query.filter_by(wd_id=wikidata_property).first()
        if prop is None:
            raise ValueError("Not found")
        return prop.property_type
    
    def __exit__(self, exc_type, exc_value, exc_traceback):
        try:
            db.session.commit()
        except:
            db.session.rollback()
            raise ValueError("Failed to commit to database session")
```




