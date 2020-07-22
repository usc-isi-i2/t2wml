import json
import csv
from pathlib import Path
from typing import Sequence, Union, Tuple, List, Dict, Any
from string import punctuation
from SPARQLWrapper.SPARQLExceptions import QueryBadFormed
from t2wml.utils import t2wml_exceptions as T2WMLExceptions
from t2wml.wikification.wikidata_provider import SparqlProvider
from t2wml.settings import t2wml_settings

def get_provider():
    wikidata_provider=t2wml_settings["wikidata_provider"]
    if wikidata_provider is None:
        wikidata_provider=SparqlProvider(t2wml_settings["sparql_endpoint"])
        t2wml_settings["wikidata_provider"]=wikidata_provider
    return wikidata_provider


def get_property_type(prop):
    try:
        prop_type= _get_property_type(prop)
        return prop_type
    except QueryBadFormed:
        raise T2WMLExceptions.MissingWikidataEntryException("The value given for property is not a valid property:" +str(prop))
    except ValueError:
        raise T2WMLExceptions.MissingWikidataEntryException("Property not found:" +str(prop))


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

def _get_property_type(wikidata_property):
    provider=get_provider()
    property_type= provider.get_property_type(wikidata_property)
    if property_type=="Property Not Found":
        raise ValueError("Property "+wikidata_property+" not found")
    return property_type

def add_properties_from_file(file_path):
    if Path(file_path).suffix == ".json":
        with open(file_path, 'r') as f:
            input_dict= json.load(f)
    elif Path(file_path).suffix == ".tsv":    
        property_dict={} 
        input_dict={}
        with open(file_path, 'r') as f:
            reader=csv.DictReader(f, delimiter="\t")
            for row_dict in reader:
                node1=row_dict["node1"]
                label=row_dict["label"]
                value=row_dict["node2"]
                
                if label=="data_type":
                    input_dict[node1]={"property_type":value}
                if label in ["label", "description"]:
                    property_dict[(node1, label)]=value
        for node1 in input_dict:
            label=property_dict.get((node1, "label"))
            description=property_dict.get((node1, "description"))
            input_dict[node1].update({"label":label, "description":description})
    else:
        raise ValueError("Only .json and .tsv property files are currently supported")


    return_dict={"added":[], "present":[], "failed":[]}
    
    provider=get_provider()
    with provider as p:
        for node_id in input_dict:
            prop_info=input_dict[node_id]
            if isinstance(prop_info, dict):
                property_type=prop_info["property_type"]
            else:
                property_type=prop_info
                prop_info={"property_type":property_type}

            try:
                if property_type not in ["GlobeCoordinate", "Quantity", "Time","String", "MonolingualText", 
                                     "ExternalIdentifier", "WikibaseItem", "WikibaseProperty", "Url"]:
                    raise ValueError("Property type: "+property_type+" not supported")
                added=p.save_property(node_id, **prop_info)
                if added:
                    return_dict["added"].append(node_id)
                else:
                    return_dict["present"].append(node_id)
            except Exception as e:
                print(e)
                return_dict["failed"].append((node_id, str(e)))
    return return_dict
