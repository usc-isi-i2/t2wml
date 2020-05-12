import json
from etk.wikidata.utils import parse_datetime_string
from backend_code.parsing.constants import char_dict
from backend_code.t2wml_exceptions import T2WMLException
import backend_code.t2wml_exceptions as T2WMLExceptions
from backend_code.utility_functions import translate_precision_to_integer
from backend_code.wikidata_property import get_property_type
from backend_code.spreadsheets.conversions import to_excel
from backend_code.parsing.t2wml_parser import iter_on_n
from backend_code.triple_generator import generate_triples

def parse_time_for_dict(response, sparql_endpoint):
    if "property" in response and get_property_type(response["property"], sparql_endpoint)=="Time":
        if "format" in response:
            try:
                datetime_string, precision = parse_datetime_string(str(response["value"]),
                                                                    additional_formats=[
                                                                        response["format"]])
            except ValueError:
                #This is a workaround for a separatte bug, WIP, that is sending wrong dictionaries to this function
                print("attempting to parse datetime string that isn't a datetime:", str(response["value"]))
                return
            if "precision" not in response:
                response["precision"] = int(precision.value.__str__())
            else:
                response["precision"] = translate_precision_to_integer(response["precision"])
            response["value"] = datetime_string

def resolve_cell(yaml_object, col, row, sparql_endpoint):
    context={"row":int(row), "col":char_dict[col]}
    try:
        item_parsed, value_parsed, qualifiers_parsed, references_parsed= evaluate_template(yaml_object.eval_template, context)
        statement=get_template_statement(yaml_object.template, item_parsed, value_parsed, qualifiers_parsed, references_parsed, sparql_endpoint)
        if statement:
            data = {'statement': statement, 'error': None}
        else:
            data = {'statement': None, 'error': "Item doesn't exist"}
    except Exception as exception:
        error = dict()
        error["errorCode"], error["errorTitle"], error["errorDescription"] = exception.args
        data = {'error': error}
    return data


def get_template_statement(template, item_parsed, value_parsed, qualifiers_parsed, references_parsed, sparql_endpoint):
    if item_parsed:
        template["item"]=item_parsed.value
        template["cell"]=to_excel(item_parsed.col, item_parsed.row)
    if value_parsed:
        template["value"]=value_parsed.value

    attributes_parsed_dict = {'qualifier': qualifiers_parsed, 'reference': references_parsed}

    for label, attributes_parsed in attributes_parsed_dict.items():
        if attributes_parsed:
            new_atts=[]
            for a_i, attribute_dict in enumerate(template[label]):
                try:
                    new_dict=dict(attribute_dict)
                    attribute_parsed=attributes_parsed[a_i]
                                #check if item/value are not None
                    if attribute_parsed: #TODO: maybe this check needs to be moved elsewhere, or maybe it should raise an error?
                        new_dict["value"]=attribute_parsed.value
                        new_dict["cell"]=to_excel(attribute_parsed.col, attribute_parsed.row)
                        parse_time_for_dict(new_dict, sparql_endpoint)
                        new_atts.append(new_dict)
                except Exception as e:
                    raise e
            template[label]=new_atts

    parse_time_for_dict(template, sparql_endpoint)
    return template


def evaluate_template(template, context):
    item=template.get("item", None)
    value=template.get("value", None)
    qualifiers=template.get("qualifier", None)
    references=template.get("reference", None)

    item_parsed=value_parsed=qualifiers_parsed=references_parsed=None

    if item:
        item_parsed= iter_on_n(item, context)

    if value:
        value_parsed= iter_on_n(value, context)
    
    if qualifiers:
        qualifiers_parsed=[]
        for qualifier in qualifiers:
            q_parsed=iter_on_n(qualifier, context)
            qualifiers_parsed.append(q_parsed)

    if references:
        references_parsed=[]
        for reference in references:
            r_parsed=iter_on_n(reference, context)
            references_parsed.append(r_parsed)
    return item_parsed, value_parsed, qualifiers_parsed, references_parsed

def update_highlight_data(data, item_parsed, qualifiers_parsed, references_parsed):
    if item_parsed:
        item_cell=to_excel(item_parsed.col, item_parsed.row)
        data["item"].add(item_cell)
    attributes_parsed_dict= {'qualifierRegion': qualifiers_parsed, 'referenceRegion': references_parsed}
    for label, attributes_parsed in attributes_parsed_dict.items():
        if attributes_parsed:
            attribute_cells = set()
            for attribute_parsed in attributes_parsed:
                #check if item/value are not None
                if attribute_parsed: #TODO: maybe this check needs to be moved elsewhere, or maybe it should raise an error?
                    attribute_cell=to_excel(attribute_parsed.col, attribute_parsed.row)
                    attribute_cells.add(attribute_cell)
            data[label] |= attribute_cells
            

def highlight_region(yaml_object, sparql_endpoint):
    if yaml_object.use_cache:
        data=yaml_object.cacher.get_highlight_region()
        if data:
            return data

    highlight_data = {"dataRegion": set(), "item": set(), "qualifierRegion": set(), "referenceRegion": set(), 'error': dict()}
    statement_data=[]
    for col, row in yaml_object.region_iter():
        cell=to_excel(col-1, row-1)
        highlight_data["dataRegion"].add(cell)
        context={"row":row, "col":col}
        try:
            item_parsed, value_parsed, qualifiers_parsed, references_parsed= evaluate_template(yaml_object.eval_template, context)
            update_highlight_data(highlight_data, item_parsed, qualifiers_parsed, references_parsed)
            if yaml_object.use_cache:
                    statement=get_template_statement(yaml_object.template, item_parsed, value_parsed, qualifiers_parsed, references_parsed, sparql_endpoint)
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
    highlight_data['referenceRegion'] = list(highlight_data['referenceRegion'])

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
                item_parsed, value_parsed, qualifiers_parsed, references_parsed= evaluate_template(yaml_object.eval_template, context)
                statement=get_template_statement(yaml_object.template, item_parsed, value_parsed, qualifiers_parsed, references_parsed, sparql_endpoint)
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
