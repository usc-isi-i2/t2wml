# The T2WML Grammar


* [Structure](#overallstructure)
    * [Overall structure](#overallstructure)
    * [The region](#regionstructure)
    * [The template](#templatestructure)
    * [Conformance to Yaml Standards](#yamlstandards)
* [The T2WML Language](#language)
    * [Reserved keywords](#reserved)
    * [Value and Item](#valueitem)
    * [T2WML Functions](#functions)
        * [Booleans](#boolean)
            * [Operators](#operator)
            * [Functions](#boolfunc)
        * [String modifiers](#string)
        * [Other](#other)
    * [Miscellaneous](#misc)

## Structure
<span id="overallstructure"></span>

A valid T2WML file has a very specific structure it must conform to in order to work.

### The overall structure

````
statementMapping:
    region:
         - keys...
    template:
         - keys...
    created_by: demo
````



It must begin with the key `statementMapping`, opening a dictionary.

The `statementMapping` must contain the keys `region` and `template`. It can also optionally contain the key `created_by`.

The `region` and the `template` must each be a list of dictionaries (although we currently only support one entry in the list)


### The region
<span id="regionstructure"></span>

The region is used to specify which cells of the data sheet are the data area.

The `region` can be written in one of two formats.

The first option is to use the key `range` and specify a cell range, eg: `C4:E10`. This is a simple, easy option for straightforward data ranges.

The second option is to use all four of the keys `left`, `right`, `top`, and `bottom`, to specify the left, right, top, and bottom edges of the area (inclusive). These arguments can be specified dynamically using the t2wml language.

Regardless of which option is chosen, a further three optional keys can be supplied: `skip_row`, `skip_column`, and `skip_cell`. These must be lists, and their contents must be boolean expressions in the t2wml language.

#### Region example one
`````
region: 
     - left: A
       right: D
       top: 1
       bottom: 5
`````

#### Region example two
`````
region:
     - range: D3:F12
       skip_column:
            - code here...
            - more code...
       skip_cell:
            - more code...
`````

### The template
<span id="templatestructure"></span>

The template is used to build statements for each cell in the region.

It must have the keys `item`, `property`, and `value`.

It can also optionally have the attribute keys `qualifier` and `reference`, as well as the optional keys `calendar`, `precision`, `time_zone`, `format`, `lang`, `longitude`, `latitude`, `unit`.

`qualifier` and `reference` both must be lists of dictionaries. the allowed keys in their dictionaries are `item`, `property`, `value`, as well as the optional keys above.

The values for the various keys can be defined in the T2WML language (`=value[$col, $row]` is a common occurence for the key `value`, for example).

#### Template example

`````
template: 
     value: =value[$col, $row]
     item: Q1000
     property: P123
     qualifier:
           - property: P585
             value: 10
             format: "%Y"
           - property: P6001
             value: =item[A, $row]
     reference:
           - property: P246 # stated in
             value: Q11191 # The World Factbook

`````



### Conformance to Yaml standards
<span id="yamlstandards"></span>

The T2WML grammar is based on yaml files that can contain custom T2WML statements. 

Therefore T2WML files must conform to [yaml 1.1 standards](https://yaml.org/spec/1.1/). (The yaml standards most likely to trip up a T2WML user are those regarding [escaping strings](http://blogs.perl.org/users/tinita/2018/03/strings-in-yaml---to-quote-or-not-to-quote.html), if you want a shorter document to read)

Note: It's not necessary to read this before writing T2WML yaml files. It's just something to be aware of if something goes wrong.

## The T2WML Language
<span id="language"></span>

By default, statements in the yaml document are parsed by the yaml parser (as ints, floats, strings, etc).

To indicate that a statement is an instance of T2WML code, the statement must be prefixed with an = sign.

`value: value[$col, $row]` will return the string "value[$col, $row]"
`value: =value[$col, $row]` will returned the evaluated value for the T2WML expression

<span id="reserved"></span>

The T2WML language contains some reserved variable names, indicated with a $ in front of the name

* `$top`, `$bottom`, `$left`, `$right` : The top, bottom, left, and right of the data range. Currently supported only when defining the region (not in template). Using for recursive definitions (left: $left+1) or circular definitions (right: $left, left: $right) is not allowed.
* `$end`: the last row of the sheet. Convenient for defining `bottom`.
* `$col`, `$row`: the current column and current row in the data region. Supported only in the template (not the region).
* `$n`: an iterator variable
* `$sheet`: the name of the current sheet

### Values and Items
<span id="valueitem"></span>

`value[col, row]` retrieves the cell contents for the cell/s indicated by col and row.

Col and row could be single constants:`value[A, 3]`. 

Either or both could be a range: `value[A:D, 4]`, `value[A:D, 3:5]`

And they can use the reserved values $col, $row, and $n: `value[A:$col, $row+$n]`

`item[col, row]` retrieves the wikidata item(s) based on the cell contents for the cell/s indicated by col, row

If the data cell contains the string "Burundi", for example, then item will retrieve the qnode "Q1000".

Be aware that when item[] values are being processed in boolean expressions, they are treated as the string representation of the qnode, ie, again "Q1000". Attempting to check whether item[col, row]=="Burundi" will fail, you need to check whether item[col, row]=="Q1000".

In order for item to work the user must have uploaded a wikifier file.

The valid col/row arguments are the same as for value. 

### Functions
<span id="functions"></span>

The T2WML language implements a variety of functions. 

These can be broadly split into boolean functions, string modifiers, and other. 

Functions can be nested. It is possible, for example, to write `contains((upper_case(value[A:B, 2:3])),”TA”)`, a case-insensitive way to check if the string “ta”, “tA”, etc is present in each cell in the range.

Not every nesting order makes sense.
`upper_case(contains(value[A:B, 2:3], “TA”))` would return a string, “FALSE” or “TRUE” (even worse, the string “FALSE” evaluates to True in boolean checks…) 


#### Boolean expressions and equations
<span id="boolean"></span>

A boolean expression- created with a function or operator- returns a True/False value.

A boolean equation is inidcated with the arrow (`->`) operator. It returns some value, based on when a boolean expression returns True. The left side argument is the boolean expression, and the right side argument is what is returned as soon as the expression is evaluated to True. (one therefore would normally have the boolean expression contain at least one of the iterables $row, $col, or $n)

`contains(value[A, $row], "human")` is a boolean expression. 

`contains(value[A, $row], "human") -> value[B, $row]` is a boolean equation.

`values[A, $row]=="human" -> value[B, $row]` is also a boolean equation

Note that `skip_col`, `skip_row`, and `skip_cell` in `region` expect to receive boolean *expressions*, not boolean equations. Where the return value of the function is True, the cell/row/column will be added to the list of cells/rows/columns to skip.

Empty cells will always evaluate to False.

##### Operators
<span id="operator"></span>

T2WML supports two boolean operators, `==` and `!=` for equal and not equal, respectively.

It is important to note that when applied to a *range*, these operators use "and" logic.

`value[A:D, $row] == "Burundi"` will only return true when all of the columns A through D in the row equal "Burundi". Similarly, `value[A:D, $row] != "Burundi"` will only return true if none of them equal "Burundi".

##### Boolean functions
<span id="boolfunc"></span>

There are currently four boolean functions.

It is important to note that when applied to a range, unlike operators, boolean functions use "or" logic. That means they will return True if the condition is True for any cell in the range.

1. `contains(arg1, arg2)`: whether the string value of arg1 contains arg2 (as a substring) anywhere.
2. `starts_with(arg1, arg2)`: same as contains but must start with arg2.
3. `ends_with(arg1, arg2)`: same as contains but must end with arg2.
4. `instance_of(input, qnode)`: checks whether the input has an "instance of" relationship with the qnode. both must be items or qnode strings. As described in the [Wikidata query tutorial](https://www.wikidata.org/wiki/Wikidata:SPARQL_tutorial), the query uses “instance of” followed by any number of “subclass of”. ( wdt:P31/wdt:P279* )
  * `instance_of(“Q378619”, “Q146”)` would return True
  * `instance_of_qnode(item[A, 3], “Q146”)` would return True if the item for cell A3 was an instance of Q146, eg Q378619
  * `instance_of_qnode(value[B, 3], “Q146”)` would return True if the value for cell A3 was a string that happened to be a valid qnode string for a qnode that was an instance of Q146.
  * `instance_of_qnode(item[A, 3:6], “Q146”)` would return True if cells A3-A6 all were items that are instances of Q146

#### String modifiers
<span id="string"></span>
String modifier functions receive a value, value range, or string and perform various modifications on them.

If the string modifier receives a value range, it will perform the string modification on every value in the range.

It does not make sense to run string modifiers on items or item ranges, and attempting to do so will raise an error.

For simplicity, the examples all use a string for the input, but they would apply equally to a value for a cell whose contents are the string in the example, or a value range.

`strip(input)`: Removes leading and trailing whitespace from the input

`title_case(input)`: Changes the case of the input to titlecase.

`upper_case(input)`: Changes the case of the input to uppercase

`lower_case(input)`: Changes the case of the input to lowercase

`clean(input)`:  Uses the ftfy package to clean the input, eg schÃ¶n becomes schön

`replace(input, to_replace, replace_with)`: replaces instance of to_replace with replace_with. to_replace can be a regex. (therefore you will need to escape regex characters you want treated literally)

* `replace("cats and dogs and cats", "cats", "turtles")` returns "turtles and dogs and turtles"
* `replace(" 30 456 e", "[^\d.-]", "")` returns "30456"



`split_index(input, split_char, i)`: Splits the input on the split_char, and returns the ith item from the split, where i is 1-indexed. For example, `split_index(“yes,no,maybe”, “,”, 2)` returns “no”

`substring(input, start (,end))`: Returns a substring of the input, from start to end, inclusive. (end is optional, if not provided the end will be the end of the string). Negatives indices are counted from the end of the string.

* `substring("platypus", 3)` returns “atypus”
* `substring("platypus", 3, 5)` returns "aty"
* `substring(“platypus”, 3, -2)` returns "atypu"

`extract_date(input, format_string)`: Attempts to extract a date from the input using etk, based on the format string.
For example, `extract_date(“2000”, “%Y”)` returns  2000-01-01T00:00:00

`regex(input, pattern (,i))`: Returns the value of the ith group in the regex pattern provided if a match is found. Returns None if no regex match is found. i is optional, if i is not provided the entire match will be returned. 

Example: 
* `regex("Isaac Newton, physicist",  "(\w+) (\w+)")` returns “Isaac Newton”
* `regex("Isaac Newton, physicist",  "(\w+) (\w+)", 1)` returns “Isaac”

The regex uses Python regex syntax. You can [test your regex](https://regex101.com/) to check that is returning the results you expect.

**WARNING**: Because of the need to [conform to Yaml standards](#yamlstandards), a regex containing a colon *followed by whitespace* `: `, or whitespace followed by an octothorpe ` #`, requires special handling. The recommended solution is to not use actual whitespace, but rather the whitespace character `\s`, eg: `:\s`, `\s#`. You can also single-quote the entire line while double-quoting the regex string, eg: `item '=regex(value[B, 2], "profile: (.*) \d{4}", 1)'`.

#### Other
<span id="other"></span>

Functions which do not behave like boolean functions or like string modifiers.

`get_item(input(, context))`

get_item receives an input which can be resolved to a string (for example, a value, the output of any string modifer, or just a string).

It optionally receives a context-- if no context is provided, the default context (`"__NO_CONTEXT__"`) is used.

It then looks up this string in the item table. If the string is not present in the item table it will return an error. Otherwise, it returns the item from the item table.

Obviously the preferred way to get an item from a string is to use the wikifier. `get_item` was created for situations where simply grabbing the string from a cell was not sufficient, for example, if it is necessary to use a regex on the cell to get the needed string.

example: `item: '=get_item(regex(value[B, 2], "profile: (.*) \d{4}", 1))'`


`concat(*args)`

concat receives a variable number of arguments, **the last of which must be the join character**

For arguments that are ranges, rather than single values, concat will join everything in the range, in row-major order.


|     | A | B | C |
| --- | --- | --- | --- |
| 1   | Males  | Yes  | Bird  |
| 2   | Female  | No  | Fire  |
| 3   | Males  | Maybe  | Water  |

* `concat(value[B:C, 2:3], “implies”,  item[A, 1:2], “-”)`

Would return the string “No-Fire-Maybe-Water-implies-Q6581072-Q6581097”

Concat does not preserve row/column source information. This means that concat does not return information for highlighting in the spreadsheet, unlike string modifiers. (for example, if you define item in your template to be concat(something), you won’t get blue highlighting) 


### Miscellaneous
<span id="misc"></span>

If for some reason you need a string value to start with "=" (and not have it be interepreted as T2WML code), you can escape it with a forward slash `/=`. If for some reason you need a string value to start with a forward slash followed by an equal sign, you can escape the initial forward slash with an additional forward slash `//=`. And so on. So `value: /=)` would return the string "=)"

This is only necessary at the beginning of a statement, forward slashes and equal signs in the middle of a string require no special treatment, eg: `value: The smiley /= is = to =/`