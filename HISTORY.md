T2WML History
===================

Changes in version 2.0a12:
------------------------
* bug fixes:
   - duplicate edges in kgtk output
   - missing quotations in kgtk output
   - driver.py crashed on missing file

Changes in version 2.0a11:
------------------------
* fixed bug that was forcing incorrect property captilization for multi-word property types
* uploading proprties that already exist now overwrites the type of the existing properties
* attempting to upload properties of a type that is not supported will now return an error

Changes in version 2.0a10:
------------------------
* performance improvements

Changes in version 2.0a9:
------------------------
* added support for uploading properties from a kgtk tsv file
* added slight optimization for r2wml expressions that only need to be evaluated once

Changes in version 2.0a8:
------------------------
* added patch support for getting items by string+context from item table
* added function get_item to t2wml grammar
* bug fixes:
    - fixed a typo in kgtk keys that was breaking kgtk download
    - fixed an error that was ignoring additional keys in the template

Changes in version 2.0a7:
------------------------
* added a replace function to t2wml grammar
* added kgtk (.csv) download support
* bug fixes:
     - local version was reading spreadsheets wrong
     - local version had multiple bugs in generate_download_file
     - wikify_region now works
     - frontend preview output could not handle item not having a cell associated with it (eg being hardcoded)
* switched to RESTful api, frontend has been refactored into components

Changes in version 2.0a6:
------------------------
* added support for uploading a json properties file
* bug fixes:
   - download was overwriting existing values in a loop 

Changes in version 2.0a5:
------------------------
* bug fixes: 
   - download was broken and is now fixed
   - removed a security leak
   - fixed a bug where $n - x would incorrectly cause yaml file to be declared invalid
* all spreadsheet handling is now done with pandas, pyexcel has been removed from requirements
* http error codes are now returned instead of 200. UI display of error codes is not yet updated to match
* in local driver/tests, sheets no longer automatically generate a pickle file folder. caching must be explicitly set as an option. 
* some changes to api


Changes in version 2.0a4
------------------------
* backwards-compatibility breaking changes to the T2WML syntax:
  - plain variable n is now $n for consistency
* added reserved variable $sheet for name of the current sheet
* added support for references
* change to API: when creating YamlObject, also need to include sparql_endpoint
* bug fixes:
  - sparql_endpoint now updates in bindings when creating YamlObject, so that instance_of uses YO endpoint

Changes in version 2.0a3
------------------------
* backwards-compatibility breaking changes to the T2WML syntax:
  - code statements must now begin with an equal sign
  - t2wml Boolean functions are now "or", not "and"
  - the t2wml function regex() has been fixed to return ith group, not ith instance
* added option to specify "range:" for region instead of top, bottom, left, right
* added reserved variable $end for end of the spreadsheet
* added t2wml function instance_of
* added support for non alphanumeric strings
* bug fixes:
  - caching in yaml file didn't register when a new yaml was uploaded
  - fixes to handling of ranges
  - non-code values for Item/Value were raising errors
  - skip_cell etc weren't including the final edges of rows/column in their check
  - include support for n in region, not just template
  - changing value of Item disabled

Changes in version 2.0a2 
-------------------------
* created python package distribution for the code, t2wml-standalone
* performance improvements to speed up code
* backwards-compatibility breaking changes to the T2WML syntax:
  - parentheses replaced with brackets for value and item
  - forward slash replaced with comma for indexes within the brackets
  - range boundaries now match excel style (inclusive)
  - = replaced with ==
  - contains, starts_with, ends_with are now functions
* added a long list of functions to the T2WML language

