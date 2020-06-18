import ftfy
import re
from etk.wikidata.utils import parse_datetime_string
from SPARQLWrapper import SPARQLWrapper, JSON
from backend_code.bindings import bindings
from backend_code.parsing.classes import ReturnClass, RangeClass, Item

def boolean_modifer(func):
    def wrapper(input, *args, **kwargs):
        if input: #if value is not None
            if isinstance(input, RangeClass): #handle ranges separately:
                for i, val in enumerate(input):
                    if val:
                        flag=func(input[i], *args, **kwargs)
                        if flag == True:
                            return True
                return False
            return func(input, *args, **kwargs)
        return False
    return wrapper

@boolean_modifer
def contains(input, section):
    return section in str(input)

@boolean_modifer
def starts_with(input, section):
    return str(input).startswith(section)

@boolean_modifer
def ends_with(input, section):
    return str(input).endswith(section)

@boolean_modifer
def instance_of(input, qnode):
    query="ASK {wd:"+str(input)+" wdt:P31/wdt:P279* wd:"+ str(qnode) +"}"
    sparql = SPARQLWrapper(bindings.sparql_endpoint)
    sparql.setQuery(query)
    sparql.setReturnFormat(JSON)
    results = sparql.query().convert()
    return results['boolean']


def string_modifier(func):
    def wrapper(input, *args, **kwargs):
        if input: #if value is None, don't modify
            if isinstance(input, RangeClass): #handle ranges separately:
                for i, val in enumerate(input):
                    if val:
                        input[i]=func(str(input[i]), *args, **kwargs)
            res_string=func(str(input), *args, **kwargs)
            try:
                input.value=res_string
                return input
            except: 
                return res_string
        return input
    return wrapper


@string_modifier
def strip(input):
    return input.strip()

@string_modifier
def lower_case(input):
    return input.lower()

@string_modifier
def upper_case(input):
    return input.upper()

@string_modifier
def title_case(input):
    return input.title()

@string_modifier
def clean(input):
    return ftfy.fix_text(input)

@string_modifier
def replace(input, to_replace, replacer):
    val = re.sub(to_replace, replacer, input)
    return val
    #return input.replace(to_replace, replacer)


@string_modifier
def split_index(input, character, i):
    # split a cell on some character and return the i-th value
    # e.g., if D3 has “paul, susan, mike” then index(value(D/3), “,”, 3) returns mike
    # this is a primitive version of a much more sophisticated feature we need to add later to deal with 
    # cells that contain lists.
    vals=str(input).split(character)
    return vals[i-1] #1-indexed to 0-indexed

@string_modifier
def substring(input, start, end=None):
    #1-based indexing
    #substring("platypus", 3, 5) would be "aty" and substring(pirate, 2, -2) would return "irat"
    
    #adjust to 0-indexing
    if start<0:
        start+=1
    else:
        start-=1
    if end<0:
        end+=1
    return str(input)[start-1:end] 

@string_modifier
def extract_date(input, date_format):
    date_str, precision= parse_datetime_string(str(input),
                                additional_formats=[date_format])
    return date_str

@string_modifier
def regex(input, pattern, i=0):
    # extract a substring using a regex. The string is the regex and the result is the value of the first group in 
    # the regex. If the regex contains no group, it is the match of the regex.
    #regex(value[], "regex") returns the first string that matches the whole regex
    #regex(value[]. regex, i) returns the value of group i in the regex
    #The reason for the group is that it allows more complex expressions. In our use case we could do a single expression as we cannot fetch more than one
    #common use case "oil production in 2017 in cambodia"
    match = re.search(pattern, input)
    if match:
        return match.group(i)


def concat(*args):
    # concatenate a list of expression, e.g., concat(value(D/$row), “, “, value(F/$row))
    # ranges are concatenated in row-major order
    # the last argument is the separator
    # this is not a string modifier function. it does not change values in place, it creates a new return object
    sep=args[-1]
    args=args[:-1]
    return_str=""
    for arg in args:
        if isinstance(arg, RangeClass):
            for thing in arg:
                return_str+=str(thing)
                return_str+=sep
        else:
            if arg: #skip empty values:
                return_str+=str(arg)
                return_str+=sep

    #remove the last sep
    length=len(sep)
    return_str=return_str[:-length]

    r=ReturnClass(None, None, return_str)
    return r

def get_item(input, context="__NO_CONTEXT__"):
    value= bindings.item_table.get_item_by_string(str(input), context)
    if isinstance(input, ReturnClass):
        return ReturnClass(input.col, input.row, value)
    return value
    



functions_dict=dict(
    contains=contains,
    starts_with=starts_with,
    ends_with=ends_with,
    instance_of=instance_of,
    strip=strip,
    lower_case=lower_case,
    upper_case=upper_case,
    title_case=title_case, 
    clean=clean,
    replace=replace,
    split_index=split_index,
    substring=substring,
    extract_date=extract_date,
    regex=regex,
    concat=concat,
    get_item=get_item
)