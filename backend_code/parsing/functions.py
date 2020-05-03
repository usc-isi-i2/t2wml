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

def strip(input):
    return str(input).strip()

def lower(input):
    return str(input).lower()

def upper(input):
    return str(input).upper()

def title(input):
    return str(input).title()

def clean(input):
    return ftfy.fix_text(str(input))

def split_index(item, character, i):
    # split a cell on some character and return the i-th value
    # e.g., if D3 has “paul, susan, mike” then index(value(D/3), “,”, 3) returns mike
    # this is a primitive version of a much more sophisticated feature we need to add later to deal with 
    # cells that contain lists.
    items=str(item).split(character)
    return items[i-1] #1-indexed to 0-indexed


def substring(input, start, end=-1):
    #1-based indexing
    #substring("platypus", 3, 5) would be "aty" and substring(pirate, 2, -2) would return "irat"?
    return str(input)[start+1:end]

def concat(*args):
    # concatenate a list of expression, e.g., concat(value(D/$row), “, “, value(F/$row))
    raise NotImplementedError

def t_regex(in_string, reg, i=0):
    # extract a substring using a regex. The string is the regex and the result is the value of the first group in 
    # the regex. If the regex contains no group, it is the match of the regex.
    #regex(value[], "regex") returns the first string that matches the whole regex
    #regex(value[]. regex, i) returns the value of group i in the regex
    #The reason for the group is that it allows more complex expressions. In our use case we could do a single expression as we cannot fetch more than one

    raise NotImplementedError

def date_format(input, date_format):
    return parse_datetime_string(str(input),
                                additional_formats=[date_format])
    raise NotImplementedError

def instance_of_qnode(item, qnode):
    
    query="ASK {wd:"+str(item)+" wdt:P31/wdt:P279* wd:"+ str(qnode) +"}"
    sparql = SPARQLWrapper(bindings.sparql_endpoint)
    sparql.setQuery(query)
    sparql.setReturnFormat(JSON)
    results = sparql.query().convert()
    return results['boolean']






functions_dict=dict(
    contains=contains,
    starts_with=starts_with,
    ends_with=ends_with,
    strip=strip,
    lower=lower,
    upper=upper,
    title=title, 
    clean=clean,
    split_index=split_index,
    substring=substring,
    concat=concat, 
    t_regex=t_regex,
    date_format=date_format,
    instance_of_qnode=instance_of_qnode
)