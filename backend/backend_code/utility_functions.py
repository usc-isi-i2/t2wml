import json
import csv
from pathlib import Path
from SPARQLWrapper import SPARQLWrapper, JSON
from typing import Sequence, Union, Tuple, List, Dict, Any
from google.oauth2 import id_token
from string import punctuation
from google.auth.transport import requests
from backend_code import t2wml_exceptions as T2WMLExceptions
from backend_code.wikidata_property import WikidataProperty, WikidataItem, ValueAlreadyPresentError
from app_config import GOOGLE_CLIENT_ID


def is_csv(file_path):
    file_extension=Path(file_path).suffix
    is_csv = True if file_extension.lower() == ".csv" else False
    return is_csv

def string_is_valid(text: str) -> bool:
    def check_special_characters(text: str) -> bool:
        return all(char in punctuation for char in str(text))
    if text is None or check_special_characters(text):
        return False
    text=text.strip().lower()
    if text in ["", "#na", "nan"]:
        return False
    return True

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


def verify_google_login(tn: str) -> Tuple[dict, dict]:
    """
    This function verifies the oauth token by sending a request to Google's server.
    :param tn:
    :return:
    """
    error = None
    try:
        # client_id = '552769010846-tpv08vhddblg96b42nh6ltg36j41pln1.apps.googleusercontent.com'
        request = requests.Request()
        user_info = id_token.verify_oauth2_token(tn, request, GOOGLE_CLIENT_ID)

        if user_info['iss'] not in ['accounts.google.com', 'https://accounts.google.com']:
            raise T2WMLExceptions.AuthenticationFailureException("Token issued by an invalid issuer")
            user_info = None

    except ValueError as e:
        user_info = None
        raise T2WMLExceptions.AuthenticationFailureException(str(e))
    return user_info, error


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
    
