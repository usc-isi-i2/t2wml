T2WML API History
===================================

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