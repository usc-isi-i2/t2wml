import os
import re
import json
import csv
import yaml
from SPARQLWrapper import SPARQLWrapper, JSON
from string import punctuation
from typing import Sequence, Union, Tuple, List, Dict, Any
from google.oauth2 import id_token
from google.auth.transport import requests
from backend_code import t2wml_exceptions as T2WMLExceptions
from app_config import GOOGLE_CLIENT_ID


def check_special_characters(text: str) -> bool:
    """
    This function checks if the text is made up of only special characters
    :param text:
    :return:
    """
    return all(char in punctuation for char in str(text))

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


def natural_sort_key(s: str) -> list:
    """
    This function generates the key for the natural sorting algorithm
    :param s:
    :return:
    """
    _nsre = re.compile('([0-9]+)')
    return [int(text) if text.isdigit() else text.lower() for text in re.split(_nsre, s)]


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

    except ValueError as exception:
        user_info = None
        raise T2WMLExceptions.AuthenticationFailureException(str(exception))
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


def save_wikified_result(serialized_row_data: List[dict], filepath: str):
    keys = ['context', 'col', 'row', 'value', 'item', 'label', 'desc']
    serialized_row_data.sort(key=lambda x: [x['context'], natural_sort_key(x['col']), natural_sort_key(x['row'])])
    with open(filepath, 'w', newline='', encoding="utf-8") as output_file:
        dict_writer = csv.DictWriter(output_file, keys)
        dict_writer.writeheader()
        dict_writer.writerows(serialized_row_data)

