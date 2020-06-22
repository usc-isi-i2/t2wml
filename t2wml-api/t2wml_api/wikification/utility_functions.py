import json
import csv
from pathlib import Path
from SPARQLWrapper import SPARQLWrapper, JSON
from typing import Sequence, Union, Tuple, List, Dict, Any
from string import punctuation
from t2wml_api.utils import t2wml_exceptions as T2WMLExceptions


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


def query_wikidata_for_label_and_description(items: str, sparql_endpoint: str):
    query = """PREFIX wd: <http://www.wikidata.org/entity/>
            PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
            PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
            SELECT ?qnode (MIN(?label) AS ?label) (MIN(?desc) AS ?desc) WHERE { 
              VALUES ?qnode {""" + items + """} 
              ?qnode rdfs:label ?label; <http://schema.org/description> ?desc.
              FILTER (langMatches(lang(?label),"EN"))
              FILTER (langMatches(lang(?desc),"EN"))
            }
            GROUP BY ?qnode"""
    sparql = SPARQLWrapper(sparql_endpoint)
    sparql.setQuery(query)
    sparql.setReturnFormat(JSON)
    try:
        results = sparql.query().convert()
    except:
        return None
    response = dict()
    try:
        for i in range(len(results["results"]["bindings"])):
            qnode = results["results"]["bindings"][i]["qnode"]["value"].split("/")[-1]
            label = results["results"]["bindings"][i]["label"]["value"]
            desc = results["results"]["bindings"][i]["desc"]["value"]
            response[qnode] = {'label': label, 'desc': desc}
    except IndexError:
        pass
    return response


def query_wikidata_for_property_type(wikidata_property, sparql_endpoint):
    query = """SELECT ?type WHERE {
                wd:""" + wikidata_property + """ rdf:type wikibase:Property ;
                wikibase:propertyType ?type .
            }"""
    sparql = SPARQLWrapper(sparql_endpoint)
    sparql.setQuery(query)
    sparql.setReturnFormat(JSON)
    results = sparql.query().convert()
    try:
        property_type = results["results"]["bindings"][0]["type"]["value"].split("#")[1]
    except IndexError:
        property_type = "Property Not Found"
    return property_type

def add_properties_from_file(file_path):
    raise NotImplementedError

def get_property_type(wikidata_property: str, sparql_endpoint: str):
    property_type=query_wikidata_for_property_type(wikidata_property, sparql_endpoint)
    if property_type=="Property Not Found":
        raise ValueError("Property "+wikidata_property+" not found")
    return property_type

def get_labels_and_descriptions(items: set, sparql_endpoint: str):
    response=dict()
    new_items=query_wikidata_for_label_and_description(items, sparql_endpoint)
    response.update(new_items)
    return response

'''
from t2wml_api.wikification.wikidata_property import WikidataProperty, WikidataItem, ValueAlreadyPresentError

def get_labels_and_descriptions(items: set, sparql_endpoint: str):
    response=dict()
    items_not_found=""
    for item in items:
        try:
            wdi= WikidataItem.query.filter_by(wd_id=item).first()
            response[wdi.wd_id] =  {'label': wdi.label, 'desc': wdi.description}
        except AttributeError as e:
            items_not_found+="wd:" + item + " "
    if items_not_found:
        new_items=query_wikidata_for_label_and_description(items_not_found, sparql_endpoint)
        response.update(new_items)
        for wd_id in new_items:
            item_dict=new_items[wd_id]
            WikidataItem.add(wd_id, item_dict['label'], item_dict['desc'])
    return response

def get_property_type(wikidata_property: str, sparql_endpoint: str) -> str:
    """
    This functions queries the wikidata to find out the type of a wikidata property
    :param wikidata_property:
    :param sparql_endpoint:
    :return:
    """
    try:
        prop = WikidataProperty.query.get(wikidata_property)
        if prop is None:
            raise ValueError("Not found")
        return prop.property_type
    except Exception as e:
        property_type=query_wikidata_for_property_type(wikidata_property, sparql_endpoint)
        if property_type=="Property Not Found":
            raise ValueError("Property "+wikidata_property+" not found")
        WikidataProperty.add(wikidata_property, property_type)
    return property_type


def add_properties_from_file(file_path):
    if Path(file_path).suffix == ".json":
        with open(file_path, 'r') as f:
            input_dict= json.load(f)
    if Path(file_path).suffix == ".tsv":     
        with open(file_path, 'r') as f:
            reader=csv.DictReader(f, delimiter="\t")
            input_dict={row_dict["node1"]: str(row_dict["node2"]) for row_dict in reader if row_dict["label"]=="data_type"}

    return_dict={"added":[], "present":[], "failed":[]}
    for key in input_dict:
        prop_type=input_dict[key]
        try:
            if prop_type not in ["GlobeCoordinate", "Quantity", "Time","String", "MonolingualText", "ExternalIdentifier", "WikibaseItem", "WikibaseProperty"]:
                raise ValueError("Property type: "+prop_type+" not supported")
            added=WikidataProperty.add_or_update(key, prop_type, do_session_commit=False)
            if added:
                return_dict["added"].append(key)
            else:
                return_dict["present"].append(key)
        except Exception as e:
            print(e)
            return_dict["failed"].append((key, str(e)))
    try:
        WikidataProperty.do_batch_commit()
    except Exception as e:
        return_dict={"added":[], "present":[], "failed":"Upload critically failed due to error committing to database: "+ str(e)}
    return return_dict
    
'''