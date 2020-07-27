import csv
from string import punctuation
from flask import request
import web_exceptions
from models import Project
from wikidata_models import WikidataItem, WikidataProperty
from SPARQLWrapper import SPARQLWrapper, JSON
from app_config import DEFAULT_SPARQL_ENDPOINT

wikidata_label_query_cache={}

def query_wikidata_for_label_and_description(items):
        items = ' wd:'.join(items)
        items="wd:"+items
        
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
        sparql = SPARQLWrapper(DEFAULT_SPARQL_ENDPOINT)
        sparql.setQuery(query)
        sparql.setReturnFormat(JSON)
        try:
            results = sparql.query().convert()
        except Exception as e:
            raise e
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

def get_labels_and_descriptions(items):
    response=dict()
    missing_items=[]
    for item in items:
            wp= WikidataItem.query.filter_by(wd_id=item).first()
            if wp:
                label=desc=""
                if wp.label:
                    label=wp.label
                if wp.description:
                    desc=wp.description
                response[item]=dict(label=label, desc=desc)
            else:
                missing_items.append(item)
    try:
        additional_items=query_wikidata_for_label_and_description(missing_items)
        response.update(additional_items)
    except: #eg 502 bad gateway error
        pass
    return response

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
    except Exception as e:
        print("got an error while making sparql query", str(e))
        return None
    
    try:
        label = results["results"]["bindings"][0]["label"]["value"]
        return label
    except Exception as e:
        print("results did not include a label")
        return None
    

def get_qnode_label(node):
    try:
        wp= WikidataProperty.query.filter_by(wd_id=node).first()
        if wp:
            if wp.label:
                wikidata_label_query_cache[node]=wp.label
                return wp.label
        wp= WikidataItem.query.filter_by(wd_id=node).first()
        if wp:
            if wp.label:
                wikidata_label_query_cache[node]=wp.label
                return wp.label
    except Exception as e:
        pass #continue directly to sparql query
    
    #no point making many wikidata queries, results won't change
    cached_label=wikidata_label_query_cache.get(node)
    if cached_label:
        return cached_label
    try:
        label=query_wikidata_for_label(node)
        wikidata_label_query_cache[node]=label
    except: #eg 502 bad gateway
        return None
    return label
    

def upload_item_defs(file_path):
    property_dict={} 
    items=[]
    with open(file_path, 'r') as f:
        reader=csv.DictReader(f, delimiter="\t")
        for row_dict in reader:
            node1=row_dict["node1"]
            label=row_dict["label"]
            value=row_dict["node2"]
            if label in ["label", "description"]:
                property_dict[(node1, label)]=value
                items.append(node1)

    for node1 in items:
        label=property_dict.get((node1, "label"))
        description=property_dict.get((node1, "description"))
        added=WikidataItem.add_or_update(node1, label, description, do_session_commit=False)
    
    WikidataItem.do_commit()

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

