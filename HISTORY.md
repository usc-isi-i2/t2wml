T2WML History
===================

Changes in current unnamed version (wip)
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

