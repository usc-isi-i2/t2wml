import ftfy
import re
from etk.wikidata.utils import parse_datetime_string


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
    #need to make decisions about how indexing of the substr will work (0 or 1 based, negative, etc)
    return str(input)[start:end]

def concat(*args):
    # concatenate a list of expression, e.g., concat(value(D/$row), “, “, value(F/$row))
    raise NotImplementedError

def t_regex(in_string, reg, *num):
    # extract a substring using a regex. The string is the regex and the result is the value of the first group in 
    # the regex. If the regex contains no group, it is the match of the regex.
    raise NotImplementedError

def date_format(input, date_format):
    raise NotImplementedError

def instance_of(item, qnode):
    raise NotImplementedError






functions_dict=dict(
    concat=concat, 
    substring=substring,
    t_regex=t_regex,
    strip=strip,
    lower=lower,
    upper=upper,
    title=title, 
    date_format=date_format,
    instance_of=instance_of,
    clean=clean,
    split_index=split_index,
    contains=contains,
    starts_with=starts_with,
    ends_with=ends_with
)