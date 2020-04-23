import json
from etk.wikidata.utils import parse_datetime_string
from backend_code.utility_functions import translate_precision_to_integer#, get_property_type

from backend_code.spreadsheets.conversions import cell_tuple_to_str
from backend_code.t2wml_exceptions import T2WMLException
import backend_code.t2wml_exceptions as T2WMLExceptions
from backend_code.utility_functions import translate_precision_to_integer, get_property_type
from backend_code.spreadsheets.conversions import cell_range_str_to_tuples, column_index_to_letter, cell_tuple_to_str
from backend_code.parsing.t2wml_parser import iter_on_n
from backend_code.bindings import bindings
from backend_code.triple_generator import generate_triples

def parse_time_for_dict(response, sparql_endpoint):
    if "property" in response and get_property_type(response["property"], sparql_endpoint)=="Time":
        if "format" in response:
            try:
                datetime_string, precision = parse_datetime_string(response["value"],
                                                                    additional_formats=[
                                                                        response["format"]])
                if "precision" not in response:
                    response["precision"] = int(precision.value.__str__())
                else:
                    response["precision"] = translate_precision_to_integer(response["precision"])
                response["value"] = datetime_string
            except Exception as e:
                raise e

def resolve_cell(yaml_parser, col, row, sparql_endpoint):
    context={"row":row, "col":col}
    context.update(yaml_parser._region_props)
    try:
        statement=evaluate_template(yaml_parser.template, context, sparql_endpoint)
        if statement:
            data = {'statement': statement, 'error': None}
        else:
            data = {'statement': None, 'error': "Item doesn't exist"}
    except Exception as exception:
        error = dict()
        error["errorCode"], error["errorTitle"], error["errorDescription"] = exception.args
        data = {'error': error}
    return data



def evaluate_template(template: dict, context:dict, sparql_endpoint: str) -> dict:
    response=dict(template)
    #separately handle qualifier
    template_qualifier=template.pop("qualifier", None)
    if template_qualifier:
        for q_i, q in enumerate(template_qualifier):
            temp_dict=dict(q)
            for key in q:
                if key!= 'property' and key!="format" and not str(temp_dict[key]).isalnum():
                    try:
                        new_val=iter_on_n(temp_dict[key], context)
                        #add code here
                        temp_dict["cell"]=cell_tuple_to_str(new_val.col, new_val.row)
                        temp_dict[key]=new_val.value
                    except Exception as e:
                        raise e
            parse_time_for_dict(temp_dict, sparql_endpoint)
            template_qualifier[q_i]=temp_dict

    for key in template:
        if not str(template[key]).isalnum():
            try:
                new_val=iter_on_n(template[key], context)
                #add code here
                response["cell"]=cell_tuple_to_str(new_val.col, new_val.row)
                response[key]=new_val.value
            except Exception as e:
                raise (e)

    parse_time_for_dict(response, sparql_endpoint)
    
    #add qualifier back in
    if template_qualifier:
        response["qualifier"]=template_qualifier
    
    return response


def highlight_region(yaml_parser, sparql_endpoint, file_path):
    data = {"dataRegion": set(), "item": set(), "qualifierRegion": set(), 'error': dict()}
    item=yaml_parser.template.get("item", None)
    value=yaml_parser.template.get("value", None)
    qualifiers=yaml_parser.template.get("qualifier", None)
    
    download_data=[]
    
    for row, col in yaml_parser.region_iter():
        download_dict=dict(yaml_parser.template)
        context={"row":row, "col":col}
        context.update(yaml_parser._region_props)
        try:
            data["dataRegion"].add(cell_tuple_to_str(col, row))
            if item:
                item_parsed= iter_on_n(item, context)
                item_cell=cell_tuple_to_str(item_parsed.col, item_parsed.row)
                data["item"].add(item_cell)

                #for download:
                download_dict["cell"]=item_cell
                download_dict["item"]=item_parsed.value

            if qualifiers:
                qualifier_cells = set()
                for q_i, qualifier in enumerate(qualifiers):
                    try:
                        statement=qualifier["value"]
                        qualifier_parsed=iter_on_n(statement, context) #evaluate statement here
                        qualifier_cell=cell_tuple_to_str(qualifier_parsed.col, qualifier_parsed.row)
                        qualifier_cells.add(qualifier_cell)
                        
                        #for download:
                        download_dict["qualifier"][q_i]["cell"]=qualifier_cell
                        download_dict["qualifier"][q_i]["value"]=qualifier_parsed.value
                        parse_time_for_dict(qualifier, sparql_endpoint)
                    except Exception as e:
                        raise e
                data["qualifierRegion"] |= qualifier_cells

            #for download
            parse_time_for_dict(download_dict, sparql_endpoint)
            download_data.append({
                "cell":cell_tuple_to_str(col, row), 
                "statement": download_dict
            })

        except Exception as exception:
            error = dict()
            error["errorCode"], error["errorTitle"], error["errorDescription"] = exception.args
            data['error'][cell_tuple_to_str(col, row)] = error
    
    #for download:
    try:
        with open(file_path, 'w') as f:
            json.dump(download_data, f)
    except Exception as e:
        pass

    data['dataRegion'] = list(data['dataRegion'])
    data['item'] = list(data['item'])
    data['qualifierRegion'] = list(data['qualifierRegion'])
    return data



def generate_download_file(yaml_parser, filetype, parsed_path, sparql_endpoint):
    response=dict()
    try:
        with open(parsed_path, 'r') as f:
            data=json.load(f)
    except Exception as e:
        data=[]
    
    if not data:
        error=[]
        for row, col in yaml_parser.region_iter():
            try:
                context={"row":row, "col":col}
                statement=evaluate_template(yaml_parser.template, context, sparql_endpoint)
                if statement:
                    data.append(
                        {'cell': cell_tuple_to_str(col, row), 
                        'statement': statement})
            except Exception as e:
                error.append({'cell': cell_tuple_to_str(col, row), 
                'error': str(e)})


    if filetype == 'json':
        response["data"] = json.dumps(data, indent=3)
        response["error"] = None
        return response
    
    elif filetype == 'ttl':
        try:
            response["data"] = generate_triples("n/a", data, sparql_endpoint, created_by=yaml_parser.created_by)
            response["error"] = None
            return response
        except Exception as e:
            print(e)
            response = {'error': str(e)}
            return response






