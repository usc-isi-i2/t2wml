
import warnings
import pandas
try:
    from etk.wikidata.utils import parse_datetime_string
    has_etk=True
except ImportError:
    has_etk=False



def parse_datetime(value, additional_formats=[]):
    #check if additional formats is a list of lists
    if isinstance(additional_formats[0], list):
        #flatten
        additional_formats=additional_formats[0]
    value=str(value)
    for date_format in additional_formats:
        try:
            datetime_string=pandas.to_datetime(value, format=date_format)
            return datetime_string.isoformat(), None
        except:
            pass
    try:
        datetime_string=pandas.to_datetime(value, infer_datetime_format=True)
        return datetime_string.isoformat(), None
    except:
        pass

    if has_etk:
        with warnings.catch_warnings(record=True) as w:#use this line to make etk stop harassing us with "no lang features detected" warnings
            datetime_string, precision = parse_datetime_string(
            value,
            additional_formats= additional_formats,
            prefer_language_date_order = False 
            )
        return datetime_string, precision
    raise ValueError('No date / datetime detected')
