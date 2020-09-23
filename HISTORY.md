T2WML Standalone Server App History
===================================

Changes in version 2.3.7:
------------------------
* upgrade to t2wml-api version wip
* get rid of project database, handle files entirely via project file
* downloaded file name based on project name (insread of results.tsv, results.json)
* delete projects by sending to trash rather than deleting directly
* replace download button with open in filesystem button
* bug fixes:
    * reloading the app would cause previously viewed project to rapidly flash in display
    * synchronization errors between database and filesystem (resolved by getting rid of database)
    * download results always displayed error, even if there was none
    * scroll bar too thin to select properly
    * various compilation warnings removed
    * rename project would lock up


Changes in version 2.3.6:
------------------------
* t2wml-api version change 0.0.13
* bug fixes:
   * thanks to millions of bugs caused by passing pid, get rid of pid entirely, pass project path
   * line separator issue caused projects not to open on posix systems

Changes in version 2.3.5:
-------------------------
* upgrade to electron 10
* t2wml-api version change 0.0.12
* changes to how labels are fetched for properties and items
* added back delete project functionality
* various small UI tweaks 
* bug fixes:
   * lots of async/await errors
   * creating a project with same name as previous, deleted project would create double entry of project

Changes in version 2.3.4:
-------------------------
* t2wml-api version 0.0.11
* uploading a file with the same name as a file present in the folder will overwrite the file in the folder (we will eventually add a warning to user and option to cancel)
* improvements to how calculation cache checks if fresh or not
* consolidated upload properties/upload items buttons into Import Entities button
* Recent projects menu item
* added back support for new/load project buttons
* added ability to reload page with F5/⌘R
* added settings menu item
* small design tweaks, like displaying project name, cursor changing on links, how date is displayed
* bug fixes in installer:
   - issue 190
   - issue 192
   - issue 200
   - weirdly large installer
* bug fixes:
   - loading a project from .t2wmlproj does not import entities properly
   - do not allow multiple projects with same directory

Changes in version 2.3.3:
-------------------------
* Full Electron executable, serving pages without an intermediate frontend
* File | Open and File | New operations
* Better support for project files, and mapping projects to directories
* Icons!

Changes in version 2.2.0:
-------------------------
* t2wml-api version 0.0.8
* added support for uploading projects
* added setting for warning for empty cells
* when loading an invalid yaml, at least return the yaml content
* installer now has access to developer console
* bug fixes:
  - added some missing utf-8 support
  - sparql endpoint changes were not being propagated
  - changing sheets error



Changes in version 2.1.1:
------------------------
* t2wml-api version 0.0.7
* support utf-8 encoding for yaml files
* bug fixes:
    - critical bug: yaml files on multi-sheet spreadsheets were being overwritten
    - use project-specific sparql endpoint when requesting node IDs
    - race condition when uploading data file and wikifier file at same time
    - "DataSheet not legal as SQL literal value" when switching sheets
    - renaming project was broken
    - when selecting a cell, the first cell selected didn't show labels properly
* removed ttl download option


Changes in version 2.1.0:
------------------------
Changed folder setup, added installer

Changes in version 2.0a21:
-------------------------
* upgrade to t2wml-api version 0.0.5
* added display for uploading properties of added/present/failed
* bug fixes:
   * sparql endpoint wasn't setting properly
   * table serialization was broken
   * properties and items weren't uploading properly because the provider setting was broken
   * use the database for get_labels_descriptions
* performance improvements: better performance when applying a yaml with missing properties


Changes in version 2.0a20:
-------------------------
* upgrade to t2wml-api version 0.0.4
* bug fixes: 
   * if there's a problem in sheet, don't switch current sheet (and get stuck)
   * metadata information was not being created in kgtk download for already-stored projects
   * return better error message if the problem with the yaml file is a nonexistent range

Changes in version 2.0a19:
-------------------------
* added support for labels and descriptions when uploading kgtk property file
* added button for uploading supplementary item information (labels and descriptions) in kgtk format
* get labels from backend, including custom uploaded ones, not directly from wikidata
   * includes small performance boost from caching
* bug fix: items weren't being saved to database

Changes in version 2.0a18:
-------------------------
* get rid of user login
* switch to port 13000
* get error listing cells when specific cells fail in wikify_region
* (from 2.0a17): files are saved under their original names.
* bug fix: storage folder was created based on cwd
* color code cells based on their errors
* upgrade to t2wml-api 0.0.2

Changes in version 2.0a17:
-------------------------
MASSIVE Backwards compatibility breaking change. API moved to its own package. Database completely refactored.

If you have installed a version prior to this one, and are now installing this or subsequent versions in the same virtual environment, you will need to manually delete your database. 

run `pip uninstall t2wml-standalone` 

You should see a list of files that will be removed, followed by:

> Would not remove (might be manually added):

> {ENV DIR}\lib\site-packages\backend\app.db

where {ENV DIR} is your environment directory

if you do not remove the app.db file, then you will get the following fatal error message when attempting to launch the t2wml server:

> ERROR [root] Error: Can't locate revision identified by 'a19320d46380'


Changes in version 2.0a16:
-------------------------
* server no longer uses gunicorn, enabling error logs to be displayed
* various error printouts added
* many error displays added to frontend 
* bug fixes:
   - display cells with errors in qualifier in preview window
   - warn user about errors in download but download anyway
   - treat None in cell[] or item[] as a bug that causes a qualifier to be errored
      - (possible fix to empty qualifier cell bug (needs to be verified))
   - if a qualifier has no Value and is not a coordinate, treat as fatal error in qualifier.
        

Changes in version 2.0a14:
-------------------------
* performance improvements:
  - set prefer_language_date_order to False
  - faster json saving
  - precompile for code in skips
* bug fixes:
  - kgtk output: don't enclose unit node in quotes
  - when loading csv, treat whitespace-only cells as empty strings
  - don't skip 0 value cells


Changes in version 2.0a13:
-------------------------
* backwards compatibility breaking: property_type_map has been removed. those properties must be added manually to the project
* json format changed from list of dicts to dict
* cell-specific errors when parsing template no longer raise error and exit.
  instead, they are added to a dictionary of errors, which is both printed to stderr and returned in the results
     * the only exception is errors in the first cell of the data, as that cell is used to verify validity of the template itself, and will immediately exit with error if invalid
* performance improvements to uploading property files
* performance improvements to calculating statements and to downloading kgtk results
* bug fixes:
   * 500 error when uploading properties file in json format

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