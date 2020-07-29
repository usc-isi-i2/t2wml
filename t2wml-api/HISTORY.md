T2WML API History
===================================

Changes in version 0.0.6:
-------------------------
* complete overhaul of region definition, added support for 'columns'/'rows'/'cells'
* backwards incompatible: 
     * changed 'skip_column/row/cell' to 'skip_columns/rows/cells'
     * renamed BaseStatementMapper to StatementMapper
     * KnowledgeGraph.save_download renamed to KnowledgeGraph.save_file
* added case insensitivity to property typing (ie, url, Url, URL now all valid)
* stop printing template errors
* bug fixes:
  * critical bug: did not recognise 0 column/0 row when wikifying
  * x->y is now valid (previously only worked with spaces, x -> y)
  * error when not sending any date formats
  * item and cell falsiness now explicitly defined

Changes in version 0.0.5:
-------------------------

* add support for list of date formats
* etk is now optional
* class SpreadsheetFile has been refined
* added class Statement
* statements are returned if they are valid (no errors in value, property, and item)
* qualifiers are included if they are valid (no errors in value, property)
* yet more docs, examples, tests

Changes in version 0.0.4:
-------------------------

* A lot more classes:
    - Wikifier class fully working, supports multiple wikifier definitions
    - ItemTable completely revamped, totally different storage and lookup mechanism including preferential lookup
    - Revamp of cell mapping, now with base class BaseStatementMapper and implementation YamlMapper
    - WikifierService class 

Changes in version 0.0.3:
------------------------

* DataFile is now SpreadsheetFile
* bug fix:  bad access to sparql endpoint
* add support for adding label and description when uploading properties in tsv

Changes in version 0.0.2:
-------------------------

* when wikify_region fails on specific cells, return error listing those cells, and wikify the rest
* create temporary csv with tempfile rather than manually
* add support for $filename to t2wml syntax
* add support for Url as property type
* do not include project name in kgtk id
* add metadata (sheet and filename) to results
* continued cleaning of server-specific code from the API

Changes in version 0.0.1:
-------------------------

* separated from the server code into own package
