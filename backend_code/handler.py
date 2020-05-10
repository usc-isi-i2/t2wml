import json
import warnings
from types import CodeType

from etk.wikidata.utils import parse_datetime_string
from SPARQLWrapper.SPARQLExceptions import QueryBadFormed

import backend_code.t2wml_exceptions as T2WMLExceptions
from backend_code.parsing.classes import ReturnClass
from backend_code.parsing.constants import char_dict
from backend_code.parsing.t2wml_parser import iter_on_n_for_code
from backend_code.spreadsheets.conversions import to_excel
from backend_code.t2wml_exceptions import T2WMLException
from backend_code.triple_generator import generate_triples
from backend_code.utility_functions import translate_precision_to_integer
from backend_code.wikidata_property import get_property_type


def parse_time_for_dict(response, sparql_endpoint):
    
    if "property" in response:
        try:
            prop_type= get_property_type(response["property"], sparql_endpoint)
        except QueryBadFormed:
            raise ValueError("The value given for property is not a valid property:" +str(response["property"]))
        
        if prop_type=="Time":
            if "format" in response:
                with warnings.catch_warnings(record=True) as w: #use this line to make etk stop harassing us with "no lang features detected" warnings
                    try:
                        datetime_string, precision = parse_datetime_string(str(response["value"]),
                                                                            additional_formats=[
                                                                                response["format"]])
                    except ValueError:
                        raise ValueError("Attempting to parse datetime string that isn't a datetime:" + str(response["value"]))

                    if "precision" not in response:
                        response["precision"] = int(precision.value.__str__())
                    else:
                        response["precision"] = translate_precision_to_integer(response["precision"])
                    response["value"] = datetime_string

def resolve_cell(yaml_object, col, row, sparql_endpoint):
    context={"row":int(row), "col":char_dict[col]}
    try:
        item_parsed, value_parsed, qualifiers_parsed= evaluate_template(yaml_object.eval_template, context)
        statement=get_template_statement(yaml_object.template, item_parsed, value_parsed, qualifiers_parsed, sparql_endpoint)
        if statement:
            data = {'statement': statement, 'error': None}
        else:
            data = {'statement': None, 'error': "Item doesn't exist"}
    except Exception as exception:
        error = dict()
        error["errorCode"], error["errorTitle"], error["errorDescription"] = exception.args
        data = {'error': error}
    return data


def get_template_statement(template, item_parsed, value_parsed, qualifiers_parsed, sparql_endpoint):
    if item_parsed:
        template["item"]=item_parsed.value
        template["cell"]=to_excel(item_parsed.col, item_parsed.row)
    if value_parsed:
        template["value"]=value_parsed.value
    if qualifiers_parsed:
        for qualifier_dict in qualifiers_parsed:
            q_val=qualifier_dict.pop("value") #deal with value last
            for key in qualifier_dict:
                if isinstance(qualifier_dict[key], ReturnClass):
                    qualifier_dict[key]=qualifier_dict[key].value
            
            qualifier_dict["value"]=q_val #return q_value, then deal with it
            if q_val:
                if isinstance(q_val, ReturnClass):
                    qualifier_dict["value"]=q_val.value
                    qualifier_dict["cell"]=to_excel(q_val.col, q_val.row)
            
            parse_time_for_dict(qualifier_dict, sparql_endpoint)    

        template["qualifier"]=qualifiers_parsed
    parse_time_for_dict(template, sparql_endpoint)
    return template


def evaluate_template(template, context):
    item=template.get("item", None)
    value=template.get("value", None)
    qualifiers=template.get("qualifier", None)

    item_parsed=value_parsed=qualifiers_parsed=None

    try:
        if item:
            item_parsed= iter_on_n_for_code(item, context)

        if value:
            value_parsed= iter_on_n_for_code(value, context)
        
        if qualifiers:
            qualifiers_parsed=[]
            for qualifier in qualifiers:
                new_qual=dict(qualifier)
                for key in qualifier:
                    if isinstance(qualifier[key], CodeType):
                        q_parsed=iter_on_n_for_code(qualifier[key], context)
                        new_qual[key]=q_parsed
                qualifiers_parsed.append(new_qual)
        return item_parsed, value_parsed, qualifiers_parsed
    except Exception as e:
        print(e)
        raise e
    
    

def update_highlight_data(data, item_parsed, qualifiers_parsed):
    if item_parsed:
        item_cell=to_excel(item_parsed.col, item_parsed.row)
        if item_cell:
            data["item"].add(item_cell)
    if qualifiers_parsed:
        qualifier_cells = set()
        for qualifier in qualifiers_parsed:
            qualifier_parsed=qualifier.get("value", None)
            if qualifier_parsed and isinstance(qualifier_parsed, ReturnClass):
                qualifier_cell=to_excel(qualifier_parsed.col, qualifier_parsed.row)
                if qualifier_cell:
                    qualifier_cells.add(qualifier_cell)
        data["qualifierRegion"] |= qualifier_cells
            

def highlight_region(yaml_object, sparql_endpoint):
    if yaml_object.use_cache:
        data=yaml_object.cacher.get_highlight_region()
        if data:
            return data

    highlight_data = {"dataRegion": set(), "item": set(), "qualifierRegion": set(), 'error': dict()}
    statement_data=[]
    for col, row in yaml_object.region_iter():
        cell=to_excel(col-1, row-1)
        highlight_data["dataRegion"].add(cell)
        context={"row":row, "col":col}
        try:
            item_parsed, value_parsed, qualifiers_parsed= evaluate_template(yaml_object.eval_template, context)
            update_highlight_data(highlight_data, item_parsed, qualifiers_parsed)

            if yaml_object.use_cache:
                    statement=get_template_statement(yaml_object.template, item_parsed, value_parsed, qualifiers_parsed, sparql_endpoint)
                    if statement:
                        statement_data.append(
                            {'cell': cell, 
                            'statement': statement})
        except Exception as exception:
            error = dict()
            error["errorCode"], error["errorTitle"], error["errorDescription"] = exception.args
            data['error'][to_excel(col, row)] = error
        
    highlight_data['dataRegion'] = list(highlight_data['dataRegion'])
    highlight_data['item'] = list(highlight_data['item'])
    highlight_data['qualifierRegion'] = list(highlight_data['qualifierRegion'])

    if yaml_object.use_cache:
        yaml_object.cacher.save(highlight_data, statement_data)
    return highlight_data



def generate_download_file(yaml_object, filetype, sparql_endpoint):
    response=dict()
    data=[]
    if yaml_object.use_cache:
        data=yaml_object.cacher.get_download()

    if not data:
        error=[]
        for col, row in yaml_object.region_iter():
            try:
                context={"row":row, "col":col}
                item_parsed, value_parsed, qualifiers_parsed= evaluate_template(yaml_object.eval_template, context)
                statement=get_template_statement(yaml_object.template, item_parsed, value_parsed, qualifiers_parsed, sparql_endpoint)
                if statement:
                    data.append(
                        {'cell': to_excel(col-1, row-1), 
                        'statement': statement})
            except Exception as e:
                error.append({'cell': to_excel(col, row), 
                'error': str(e)})


    if filetype == 'json':
        response["data"] = json.dumps(data, indent=3)
        response["error"] = None
        return response
    
    elif filetype == 'ttl':
        try:
            response["data"] = generate_triples("n/a", data, sparql_endpoint, created_by=yaml_object.created_by)
            response["error"] = None
            return response
        except Exception as e:
            print(e)
            response = {'error': str(e)}
            return response
