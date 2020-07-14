from string import punctuation
from flask import request
import web_exceptions
from models import Project
from wikidata_models import WikidataItem, WikidataProperty
from SPARQLWrapper import SPARQLWrapper, JSON
from app_config import DEFAULT_SPARQL_ENDPOINT

wikidata_label_query_cache={}

def query_wikidata_for_label(node):
    try:
        query="""SELECT DISTINCT * WHERE {
                wd:""" +  node +  """ rdfs:label ?label . 
                FILTER (langMatches( lang(?label), "EN" ) )  
                }
                LIMIT 1"""
        sparql_endpoint=DEFAULT_SPARQL_ENDPOINT
        sparql = SPARQLWrapper(sparql_endpoint)
        sparql.setQuery(query)
        sparql.setReturnFormat(JSON)
        results = sparql.query().convert()
        label = results["results"]["bindings"][0]["label"]["value"]
        return label
    except:
        #print("got an error from query result parsing")
        return None
    

def get_qnode_label(node):
    cached_label=wikidata_label_query_cache.get(node)
    if cached_label:
        #print("used cache")
        return cached_label

    try:
        wp= WikidataProperty.query.filter_by(wd_id=node).first()
        if wp:
            if wp.label:
                #print("got from wp")
                wikidata_label_query_cache[node]=wp.label
                return wp.label
        wp= WikidataItem.query.filter_by(wd_id=node).first()
        if wp:
            if wp.label:
                #print("got from wi")
                wikidata_label_query_cache[node]=wp.label
                return wp.label
    except Exception as e:
        pass #continue directly to sparql query
    
    #print("queried wikidata")
    label=query_wikidata_for_label(node)
    wikidata_label_query_cache[node]=label
    return label
    


def make_frontend_err_dict(error):
    '''
    convenience function to convert all errors to frontend readable ones
    '''
    return {
            "errorCode": 500,
            "errorTitle": "Undefined Backend Error",
            "errorDescription": str(error)
        }

def string_is_valid(text: str) -> bool:
    def check_special_characters(text: str) -> bool:
        return all(char in punctuation for char in str(text))
    if text is None or check_special_characters(text):
        return False
    text=text.strip().lower()
    if text in ["", "#na", "nan"]:
        return False
    return True


def file_upload_validator(file_extensions):
    if 'file' not in request.files:
        raise web_exceptions.NoFilePartException("Missing 'file' parameter in the file upload request")

    in_file = request.files['file']
    if in_file.filename == '':
        raise web_exceptions.BlankFileNameException("No file selected for uploading")
    
    file_extension=in_file.filename.split(".")[-1].lower()
    file_allowed = file_extension in file_extensions
    if not file_allowed:
        raise web_exceptions.FileTypeNotSupportedException("File with extension '"+file_extension+"' is not allowed")

    return in_file


def get_project_details():
    projects = list()
    for project in Project.query.all():
        project_detail = dict()
        project_detail["pid"] = project.id
        project_detail["ptitle"] = project.name
        project_detail["cdate"] = str(project.creation_date)
        project_detail["mdate"] = str(project.modification_date)
        projects.append(project_detail)
    return projects
