import json
from etk.wikidata.utils import parse_datetime_string
from backend_code.parsing.constants import char_dict
from backend_code.t2wml_exceptions import T2WMLException
import backend_code.t2wml_exceptions as T2WMLExceptions
from backend_code.utility_functions import translate_precision_to_integer, get_property_type
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
        item_parsed, value_parsed, qualifiers_parsed= evaluate_template(yaml_object.template, context)
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
        new_quals=[]
        for q_i, qualifier_dict in enumerate(template["qualifier"]):
            new_dict=dict(qualifier_dict)
            qualifier_parsed=qualifiers_parsed[q_i]
            new_dict["value"]=qualifier_parsed.value
            new_dict["cell"]=to_excel(qualifier_parsed.col, qualifier_parsed.row)
            parse_time_for_dict(new_dict, sparql_endpoint)
            new_quals.append(new_dict)
        template["qualifier"]=new_quals
    parse_time_for_dict(template, sparql_endpoint)
    return template


def evaluate_template(template, context):
    item=template.get("item", None)
    value=template.get("value", None)
    qualifiers=template.get("qualifier", None)

    item_parsed=value_parsed=qualifiers_parsed=None

    if item:
        item_parsed= iter_on_n(item, context)
    
    if value:
        value_parsed= iter_on_n(value, context)
    
    if qualifiers:
        qualifiers_parsed=[]
        for qualifier in qualifiers:
            q_parsed=iter_on_n(qualifier["value"], context)
            #check if item/value are not None
            if q_parsed: #TODO: maybe this check needs to be moved elsewhere, or maybe it should raise an error?
                qualifiers_parsed.append(q_parsed)
    
    return item_parsed, value_parsed, qualifiers_parsed

def update_highlight_data(data, item_parsed, qualifiers_parsed):
    if item_parsed:
        item_cell=to_excel(item_parsed.col, item_parsed.row)
        data["item"].add(item_cell)
    if qualifiers_parsed:
        qualifier_cells = set()
        for qualifier_parsed in qualifiers_parsed:
            qualifier_cell=to_excel(qualifier_parsed.col, qualifier_parsed.row)
            qualifier_cells.add(qualifier_cell)
        data["qualifierRegion"] |= qualifier_cells
            

def highlight_region(yaml_object, sparql_endpoint, file_path):
    data = {"dataRegion": set(), "item": set(), "qualifierRegion": set(), 'error': dict()}
    
    for col, row in yaml_object.region_iter():
        data["dataRegion"].add(to_excel(col-1, row-1))
        context={"row":row, "col":col}
        try:
            item_parsed, value_parsed, qualifiers_parsed= evaluate_template(yaml_object.template, context)
            update_highlight_data(data, item_parsed, qualifiers_parsed)

        except Exception as exception:
            error = dict()
            error["errorCode"], error["errorTitle"], error["errorDescription"] = exception.args
            data['error'][to_excel(col, row)] = error
    
    data['dataRegion'] = list(data['dataRegion'])
    data['item'] = list(data['item'])
    data['qualifierRegion'] = list(data['qualifierRegion'])
    return data



def generate_download_file(yaml_object, filetype, sparql_endpoint, parsed_path=None):
    response=dict()
    data=[]
    if parsed_path:
        try:
            with open(parsed_path, 'r') as f:
                data=json.load(f)
        except Exception as e:
            pass
            
    
    if not data:
        error=[]
        for col, row in yaml_object.region_iter():
            try:
                context={"row":row, "col":col}
                item_parsed, value_parsed, qualifiers_parsed= evaluate_template(yaml_object.template, context)
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






