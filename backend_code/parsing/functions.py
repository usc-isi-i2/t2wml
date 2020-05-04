import ftfy
import re
from etk.wikidata.utils import parse_datetime_string
from SPARQLWrapper import SPARQLWrapper, JSON
from backend_code.bindings import bindings


def contains(source, section):
    return section in str(source)

def starts_with(source, section):
    return str(source).startswith(section)

def ends_with(source, section):
    return str(source).endswith(section)

def instance_of_qnode(item, qnode):
    
    query="ASK {wd:"+str(item)+" wdt:P31/wdt:P279* wd:"+ str(qnode) +"}"
    sparql = SPARQLWrapper(bindings.sparql_endpoint)
    sparql.setQuery(query)
    sparql.setReturnFormat(JSON)
    results = sparql.query().convert()
    return results['boolean']


def string_modifier(func):
    def wrapper(input, *args, **kwargs):
        if input: #if value is None, don't modify
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
def lower(input):
    return input.lower()

@string_modifier
def upper(input):
    return input.upper()

@string_modifier
def title(input):
    return input.title()

@string_modifier
def clean(input):
    return ftfy.fix_text(input)

@string_modifier
def split_index(input, character, i):
    # split a cell on some character and return the i-th value
    # e.g., if D3 has “paul, susan, mike” then index(value(D/3), “,”, 3) returns mike
    # this is a primitive version of a much more sophisticated feature we need to add later to deal with 
    # cells that contain lists.
    vals=str(input).split(character)
    return vals[i-1] #1-indexed to 0-indexed

@string_modifier
def substring(input, start, end=-1):
    #1-based indexing
    #substring("platypus", 3, 5) would be "aty" and substring(pirate, 2, -2) would return "irat"?
    return str(input)[start+1:end]

@string_modifier
def date_format(input, date_format):
    return parse_datetime_string(str(input),
                                additional_formats=[date_format])
    raise NotImplementedError


def t_regex(in_string, reg, i=0):
    # extract a substring using a regex. The string is the regex and the result is the value of the first group in 
    # the regex. If the regex contains no group, it is the match of the regex.
    #regex(value[], "regex") returns the first string that matches the whole regex
    #regex(value[]. regex, i) returns the value of group i in the regex
    #The reason for the group is that it allows more complex expressions. In our use case we could do a single expression as we cannot fetch more than one

    raise NotImplementedError



def concat(*args):
    # concatenate a list of expression, e.g., concat(value(D/$row), “, “, value(F/$row))
    raise NotImplementedError





functions_dict=dict(
    contains=contains,
    starts_with=starts_with,
    ends_with=ends_with,
    instance_of_qnode=instance_of_qnode,
    strip=strip,
    lower=lower,
    upper=upper,
    title=title, 
    clean=clean,
    split_index=split_index,
    substring=substring,
    date_format=date_format,
    t_regex=t_regex,
    concat=concat
)