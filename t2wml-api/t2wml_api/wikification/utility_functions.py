import json
import csv
from pathlib import Path
from typing import Sequence, Union, Tuple, List, Dict, Any
from string import punctuation
from t2wml_api.utils import t2wml_exceptions as T2WMLExceptions
from t2wml_api.wikification.wikidata_provider import SparqlProvider
from t2wml_api.settings import t2wml_settings

def get_provider():
    provider=t2wml_settings["wikidata_provider"]
    if provider is None:
        provider=SparqlProvider(t2wml_settings["sparql_endpoint"])
    return provider

def translate_precision_to_integer(precision: str) -> int:
    """
    This function translates the precision value to indexes used by wikidata
    :param precision:
    :return:
    """
    if isinstance(precision, int):
        return precision
    precision_map = {
        "gigayear": 0,
        "gigayears": 0,
        "100 megayears": 1,
        "100 megayear": 1,
        "10 megayears": 2,
        "10 megayear": 2,
        "megayears": 3,
        "megayear": 3,
        "100 kiloyears": 4,
        "100 kiloyear": 4,
        "10 kiloyears": 5,
        "10 kiloyear": 5,
        "millennium": 6,
        "century": 7,
        "10 years": 8,
        "10 year": 8,
        "years": 9,
        "year": 9,
        "months": 10,
        "month": 10,
        "days": 11,
        "day": 11,
        "hours": 12,
        "hour": 12,
        "minutes": 13,
        "minute": 13,
        "seconds": 14,
        "second": 14
    }
    return precision_map[precision.lower()]


def get_property_type(wikidata_property, *args, **kwargs):
    provider=get_provider()
    property_type= provider.get_property_type(wikidata_property, *args, **kwargs)
    if property_type=="Property Not Found":
        raise ValueError("Property "+wikidata_property+" not found")
    return property_type

def get_labels_and_descriptions(items, *args, **kwargs):
    provider=get_provider()
    return provider.get_labels_and_descriptions(items, *args, **kwargs)


def add_properties_from_file(file_path):
    if Path(file_path).suffix == ".json":
        with open(file_path, 'r') as f:
            input_dict= json.load(f)
    if Path(file_path).suffix == ".tsv":     
        with open(file_path, 'r') as f:
            reader=csv.DictReader(f, delimiter="\t")
            input_dict={row_dict["node1"]: str(row_dict["node2"]) for row_dict in reader if row_dict["label"]=="data_type"}

    return_dict={"added":[], "present":[], "failed":[]}
    
    provider=get_provider()
    with provider as p:
        for prop in input_dict:
            prop_type=input_dict[prop]
            try:
                if prop_type not in ["GlobeCoordinate", "Quantity", "Time","String", "MonolingualText", "ExternalIdentifier", "WikibaseItem", "WikibaseProperty"]:
                    raise ValueError("Property type: "+prop_type+" not supported")
                added=p.save_property(prop, prop_type)
                if added:
                    return_dict["added"].append(prop)
                else:
                    return_dict["present"].append(prop)
            except Exception as e:
                print(e)
                return_dict["failed"].append((prop, str(e)))
    return return_dict
