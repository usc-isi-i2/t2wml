import ftfy


def concat(*args):
    return_str=""
    for arg in args:
        return_str+=arg
    return return_str

def substring(in_string, index1, index2=-1):
    raise NotImplementedError

def t_regex(in_string, reg, *num):
    # extract a substring using a regex. The string is the regex and the result is the value of the first group in 
    # the regex. If the regex contains no group, it is the match of the regex.
    raise NotImplementedError

def strip(input):
    return str(input).strip()

def lower(input):
    return input.lower()

def upper(input):
    return input.upper()

def title(input):
    return input.title()

def date_format(input, date_format):
    raise NotImplementedError

def instance_of(item, qnode):
    raise NotImplementedError

def clean(input):
    return ftfy.fix_text(input)

def split_index(*args):
    raise NotImplementedError

def contains(source, section):
    return section in str(source)

def starts_with(source, section):
    return str(source).startswith(section)

def ends_with(source, section):
    return str(source).endswith(section)


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