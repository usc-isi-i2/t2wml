T2WML Standalone Server App History
===================================

Changes in version 2.9.0-pre-3 (beta): 
-------------------------
* t2wml version 0.2.9
* bug fix: app crashed when navigating into empty cells in output mode
* add date formatting for most precisions
* add additional precision options
* for child dropdowns, add a disabled default option for a new annotation to denote nothing selected
* remove the format dropdown, return to text box input. 


Changes in version 2.9.0-pre-2 (beta): 
-------------------------
* t2wml-api version 0.2.8
* added suggestions during annotation process. the user receives, already selected, the backend's best guess
for what the annotation should be. if correct, user can simply click 'submit' without having to select from the 
various dropdowns.
* a variety of frontend tweaks:
   - arrow keys nav don't steal focus
   - add calendar options
   - add date format options
   - add precision options
   - various bug fixes
   - added a toggle for viewing/hiding additional fields (eg unit, date, precision)

Changes in version 2.8.1: 
-------------------------
* t2wml-api version 0.2.6
* added support for uploading tsv files as data files
* when creating a project, auto suggest folder name as project name
* don't create duplicate rows in use-wikification
* file tree:
   - for single-sheet data files, don't show sheets
   - display file name only (no relative path)
* remove support for everything related to the old style of annotation (referring to adding rows to a spreadsheet and annotating it internally)
* when adding a data file, mode defaults to annotation
* changes to how output preview displays nodes, adding urlification for value field and general handling of label and parentheses
   - this includes a bug fix where units were being displayed as junk
* when attempting to upload to datamart, fail and alert user if variable is not of type quantity
* add environment variable T2WMLHOME. when set, the .t2wml folder will be created there rather than in the os home. 
   - fix a bug where program would error out if .t2wml folder was deleted mid run
* errors:
   - when a request to backend fails because it attempts to modify a file that is open elsewhere (eg excel), return a coherent error to user
   - add error handling to the wikify menu
   - get rid of error messages when adding wikifier/entity files before adding a data file
   - change error titles to something more descriptive than "unknown backend error"


Changes in version 2.8.0: 
-------------------------
* t2wml-api version 0.2.4
* added property search bar in the annotation menu for dependent variables and qualifiers
* added wikify mode:
   - in wikify mode, a cell's wikification is displayed in the cell, with label and description, allowing the user to easily see at a glance what QNodes/properties a cell is linked to
   - in wikify mode the user can select a cell, or a cell within a block defined by the annotation, search for an appropriate wikidata QNode or Property, and apply it to that cell or all cells with the same content in the block.
   - for qnode (not property) search, the user can specify a P31 node to filter the results of their query
   - the user wikifications are saved to a file in the project
   - users can also remove any wikification they've added
* the entities tab of the file tree has some enhancements:
   - entity and wikifier files are no longer displayed alaphabetically, but rather in the order they are present in the project, which is also their order by precedence (ascending, ie last is highest precedence)
   - the ability to add files has been added to the right click menu
* bug fix: previously, changes to wikification (eg adding a new wikifier file) were not being displayed/updated in the results. this has been fixed, and all wikification changes-- adding and deleting files, auto-generation from annotation, and anything done in wikify mode-- will be displayed in the table and results.
* the wikify button has been disabled. the wikifier endpoint is currently down for an unknown amount of time.


Changes in version 2.7.1:
-------------------------
* t2wml-api version 0.2.2
* signed electron executables for Mac and Windows
* when opening t2wml from path, t2wml command exits after opening the application 
* search mode for property (for dependent variable, qualifier) and unit (same, but only type quantity) in annotation menu
* pop-up window improvements
   - esc button exits pop up
   - added x button to close pop-up
   - tab button switches fields
   - return works to submit in global settings pop up (support in entries/project settings still wip)
   - if datamart integration is ON, will not save unless datamart url is specified
* file-tree tweaks:
   - added wikifier/entity files tab
   - rename file menu items to clearer names
   - enable deleting active files
   - when adding a mapping file, automatially switch to that mapping file
   - bug with bolding selected files not always working fixed
   - removed root level node, slimming down tree
   - no side scroll bar, text overflow set to ellipsis
   - fixed errors in filetree tooltip
* bug fix: frontend wasn't correctly catching and displaying errors from backend when fetching table
* bug fix: changing range of annotation bock wasn't changing annotation block size
* show wikified cells in blue in annotation mode
* 'load to datamart' button renamed to 'load to datamart (beta)' to emphasize beta status

Changes in version 2.7.0:
------------------------
* t2wml-api version 0.2.1
* upload to datamart button behavior has changed. it is currently in BETA mode. It will only work with a locally run version of datamart, running on branch itay/t2wml-shortcut. you must change the datamart endpoint in global settings to point to the local version.
* right-click menu added to file tree. 
   * data, annotation, and yaml files can be 
      - renamed (includes support for moving around project internal directories, ie annotations/filename.json will locate it in annotations sub-directory)
      - removed from project (without deleting), 
      - deleted, 
      - opened in filesystem. 
   * sheets have:
      - add annotation/yaml (empty, will overwrite existing files if selected)
      - open existing annotation/yaml (will add to the specified sheet, including copying into project if not in project yet)
* missing properties/items are auto-generated during annotations and added to an autogenerated entity file in the project
* project/entities menu option added. opens an entity window which lists all custom entities (properties/items) in the project (whether auto-generated or uploaded from the add entities button). Entities can be edited from this window (project must be reloaded to show changes)
* added support for tags on properties (via entity file or via entity window)
* use all wikifier files instead of last-added one
* add triangle for errors with float display of errors, better-formatted
* many tweaks/changes to annotation mode (non-comprehensive list):
   - multi-select no longer supported
   - better crash resolution- a selection overlapping existing selections will be ignored
   - bug fix crash on empty cell select
   - a long list of minor bug fixes or usability tweaks
   - editable range selection in pop-up
   - disable annotation toggle on yaml files


Changes in version 2.6.1:
-----------------------
* major bug fix: the race condition that sometimes broke opening or creating projects
* t2wml-api version 0.1.0, and future builds will use t2wml-api by pypi version and not from repo
* additional changes to pip install instructions in build workflow
* split global settings (now available under File>Preferences>Global Settings) and project settings (still accessible from Project>Settings, but now also available from edit button in project list-- was previously rename project but is now "Edit project settings")
* add title, url, and description to project settings window. title is required.
* add description to display in project list
* add a new dialogue window when creating a new project, which explains to the user about choosing a folder, and enables choice of title (required), url, and description.
* preliminary support for csv results download
* restored yaml saving ability
* fix to bug that blocked downloading results from annotation
* fix to performance bug in previous version
* changes to entity database- use sparql_endpoint as an id for non-file definitions
* some small tweaks/fixes to annotation UX


Changes in version 2.6.0:
-----------------------
* t2wml-api version 0.0.21
* complete revamp of the file sidebar, which is now permanently displayed (but resizable)
   * file navigation with click
   * active files bolded
   * file tree is the only way to navigate between annotation and yaml files, the yaml file switcher has been removed
   * file tree has icons for file types, hover for full file name, arrow collapsing
* annotation files are now fully featured mapping files (like yaml files) ie can be used to create output statements etc
   * note: if an annotation is invalid (no dependent variable + main subject), it will not create any statements or colors in output mode
* the annotation mode checkbox is now a toggle. it is on annotation mode by default. 
   * selecting annotation mode while on a yaml file in the tree will switch to most recently used annotation file or create one if there isn't one already
* various UI tweaks:
   * download has been renamed "Save to file"
   * in the table legend, data has been renamed to dependent variable and majorError/minorError now have spaces
   * added triangle styling for major/minor error cells
   * don't allow users to select header row cells
   * fix off by one selection in toaster message
* some behind the scene code changes:
   * switch the backend to be stateless, state management of selected files is now in frontend
   * switch frontend/backend communication to axios
   * some minor refactoring of store



Changes in version 2.5.0:
-----------------------
* t2wml-api version 0.0.20
* Major new feature: UI support for user annotations. For now only a single annotation per sheet is supported.
* Various minor UI features accompany the main one, for example it is now possible to scroll through the table with the arrow keys 
* table separated into multiple table components
* 'add t2wml to PATH' menu item added in help menu. once invoked, you can run t2wml from the command line, and if you pass it a directory argument (including . for current directory, or relative paths from current directory) t2wml will either create a project for that directory or open an existing project if there is one. please note that linux and windows machines may require user to log out and log back in to register the change to path.
* fixed bug where it was impossible to have an empty yaml

Some known bugs related to the major changes that we are already aware of and plan on fixing in the next release:
* when switching between annotation and regular mode, the regular mode yaml will be applied, but the content in the yaml window will not be updated. 
* we removed some of the yaml switching functionality (eg the plus button for adding a new, empty yaml)
* annotations over empty cells outside of the boundaries of the data (ie at edges of spreadsheet) do weird things

The next release is planned to include a complete overhaul of the file management and mode switching, which is why we decided not to delay this release over these issues.


Changes in version 2.4.1: 
-----------------------
* t2wml-api version 0.0.19
* switch over to new table. support for annotations still a WIP.
* it is now possible to launch t2wml.exe from command line with a directory name and have that directory be directly opened as a project (or created as a project if project.t2wml doesn't exist in the directory yet). this is particularly convenient if t2wml has been added to PATH, but that functionality will be added only in a future release (you can, however, manually add it to the PATH yourself already)
* added global settings for datamart integration and datamart api url
* bug fixes:
    * loading calendar options was causing frontend to hang
    * removed gear icon for settings, it was causing bugs. access settings through project menu or ctrl/cmd+comma
    * small UI tweaks (better tooltips, renamed help menu item)
* datamart bug fixes:
    * yaml returned when loading data file
    * annotations calculated when switching sheet
* datamart integration test added to testing pipeline

Changes in version 2.4.0: 
-----------------------
* upgrade to t2wml-api version 0.0.18
* add support for multiple yaml files per sheet
* add support for saving yamls, when switching between yamls, sheets, data files or projects
* add colors for properties and metadata
* display units for qualifiers in preview window
* bug fixes: 
   - no display for cells with row/col == 0
   - don't resend a query to wikidata multiple times
   - cleaned data was being copied into other sheets in display 

Changes in version 2.3.10: 
-----------------------
* upgrade to t2wml-api version 0.0.17
* added setting for handle calendar
* remember selected sheet when switching files
* newly added files are inserted into their correct position in file sidebar
* to avoid confusion, in development mode, version number is just (dev)
* added a help menu

Changes in version 2.3.9: 
-----------------------
* upgrade to t2wml-api version 0.0.16
* added file tree with support for multiple data files in one project
* completely changed format of communication between frontend and backend, creating a set of standardized responses with defined DTOs, streamlining the reactivity, etc.
* Add support for versioning in caching so that running older versions of t2wml doesn't corrupt cache. 
* change how label fetching for results preview works (faster, less buggy, and more)
* hot fix to user agent for sparql bug
* expanded support for cleaningStatement in yaml including a menu item to toggle whether cleaned or raw is displayed and bolded text to indicate changed cells
* added versioning for numpy to work around bug in windows in numpy 1.19.4




Changes in version 2.3.8:
-----------------------
* upgrade to t2wml-api version 0.0.15
* delete project no longer deletes it at all, it just removes it from the project list (the icon is now an x)
* save window state (size, position, devtools open/not)
* keyboard shortcut for reloading app
* bug fixes:
   - clicking on a non-data (non-green) cell should not show anything (including red error message) in Output window
   - race condition when fetching properties meant getting property not found for uploaded properties
   - load new project crashes frontend- this was a major bug which required an overhaul of a lot of frontend components
* change default sparql endpoint 


Changes in version 2.3.7:
------------------------
* upgrade to t2wml-api version 0.0.14
* get rid of project database, handle entirely via project files
* custom entity definitions are now project-specific
* downloaded file's names based on project name (ie projectname.json instead of results.json)
* delete projects by sending to trash rather than deleting directly
* replace download button with open in filesystem button
* bug fixes:
    * reloading the app would cause previously viewed project to rapidly flash in display
    * synchronization errors between database and filesystem (resolved by getting rid of database)
    * download results always displayed error, even if there was none
    * scroll bar too thin to select properly
    * various compilation warnings removed
    * rename project would lock up
    * units with custom label would not show custom label


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
