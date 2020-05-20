import json
import warnings
from types import CodeType

from etk.wikidata.utils import parse_datetime_string
from SPARQLWrapper.SPARQLExceptions import QueryBadFormed

from backend_code.t2wml_exceptions import T2WMLException, make_frontend_err_dict
import backend_code.t2wml_exceptions as T2WMLExceptions
from backend_code.parsing.classes import ReturnClass
from backend_code.parsing.constants import char_dict
from backend_code.parsing.t2wml_parsing import iter_on_n_for_code
from backend_code.spreadsheets.conversions import to_excel

from backend_code.triple_generator import generate_triples
from backend_code.utility_functions import translate_precision_to_integer, get_property_type


def parse_time_for_dict(response, sparql_endpoint):
    
    if "property" in response:
        try:
            prop_type= get_property_type(response["property"], sparql_endpoint)
        except QueryBadFormed:
            raise T2WMLExceptions.InvalidT2WMLExpressionException("The value given for property is not a valid property:" +str(response["property"]))
        
        if prop_type=="Time":
            if "format" in response:
                with warnings.catch_warnings(record=True) as w: #use this line to make etk stop harassing us with "no lang features detected" warnings
                    try:
                        datetime_string, precision = parse_datetime_string(str(response["value"]),
                                                                            additional_formats=[
                                                                                response["format"]])
                    except ValueError:
                        raise T2WMLExceptions.InvalidT2WMLExpressionException("Attempting to parse datetime string that isn't a datetime:" + str(response["value"]))

                    if "precision" not in response:
                        response["precision"] = int(precision.value.__str__())
                    else:
                        response["precision"] = translate_precision_to_integer(response["precision"])
                    response["value"] = datetime_string



def get_template_statement(template, item_parsed, value_parsed, qualifiers_parsed, references_parsed, sparql_endpoint):
    if item_parsed:
        template["item"]=item_parsed.value
        template["cell"]=to_excel(item_parsed.col, item_parsed.row)
    if value_parsed:
        template["value"]=value_parsed.value
    
    attributes={"qualifier": qualifiers_parsed, "reference": references_parsed}
    for attribute_name in attributes:
        attribute=attributes[attribute_name]
        if attribute:
            for attribute_dict in attribute:
                q_val=attribute_dict.pop("value") #deal with value last
                for key in attribute_dict:
                    if isinstance(attribute_dict[key], ReturnClass):
                        attribute_dict[key]=attribute_dict[key].value
                
                attribute_dict["value"]=q_val #add q_val back, then deal with it
                if q_val:
                    if isinstance(q_val, ReturnClass):
                        attribute_dict["value"]=q_val.value
                        attribute_dict["cell"]=to_excel(q_val.col, q_val.row)
                
                parse_time_for_dict(attribute_dict, sparql_endpoint)    

            template[attribute_name]=attribute

    parse_time_for_dict(template, sparql_endpoint)
    return template


def _evaluate_template_for_list_of_dicts(attributes, context):
    attributes_parsed=[]
    for attribute in attributes:
        new_dict=dict(attribute)
        for key in attribute:
            if isinstance(attribute[key], CodeType):
                q_parsed=iter_on_n_for_code(attribute[key], context)
                new_dict[key]=q_parsed
        attributes_parsed.append(new_dict)
    return attributes_parsed


def evaluate_template(template, context):
    item=template.get("item", None)
    value=template.get("value", None)
    qualifiers=template.get("qualifier", None)
    references=template.get("reference", None)

    item_parsed=value_parsed=qualifiers_parsed=references_parsed=None


    if item:
        item_parsed= iter_on_n_for_code(item, context)

    if value:
        value_parsed= iter_on_n_for_code(value, context)
    
    if qualifiers:
        qualifiers_parsed = _evaluate_template_for_list_of_dicts(qualifiers, context)
    
    if references:
        references_parsed = _evaluate_template_for_list_of_dicts(references, context)
        
    
    return item_parsed, value_parsed, qualifiers_parsed, references_parsed

    
    

def update_highlight_data(data, item_parsed, qualifiers_parsed, references_parsed):
    if item_parsed:
        item_cell=to_excel(item_parsed.col, item_parsed.row)
        if item_cell:
            data["item"].add(item_cell)
    
    
    attributes_parsed_dict= {'qualifierRegion': qualifiers_parsed, 'referenceRegion': references_parsed}
    for label, attributes_parsed in attributes_parsed_dict.items():
        if attributes_parsed:
            attribute_cells = set()
            for attribute in attributes_parsed:
                attribute_parsed=attribute.get("value", None)
                if attribute_parsed and isinstance(attribute_parsed, ReturnClass):
                    attribute_cell=to_excel(attribute_parsed.col, attribute_parsed.row)
                    if attribute_cell:
                        attribute_cells.add(attribute_cell)
            data[label] |= attribute_cells




def highlight_region(cell_mapper):
    sparql_endpoint=cell_mapper.sparql_endpoint
    if cell_mapper.use_cache:
        data=cell_mapper.cacher.get_highlight_region()
        if data:
            return data

    highlight_data = {"dataRegion": set(), "item": set(), "qualifierRegion": set(), 'referenceRegion': set(), 'error': dict()}
    statement_data=[]
    for col, row in cell_mapper.region:
        cell=to_excel(col-1, row-1)
        highlight_data["dataRegion"].add(cell)
        context={"t_var_row":row, "t_var_col":col}
        try:
            item_parsed, value_parsed, qualifiers_parsed, references_parsed= evaluate_template(cell_mapper.eval_template, context)
            update_highlight_data(highlight_data, item_parsed, qualifiers_parsed, references_parsed)

            if cell_mapper.use_cache:
                    statement=get_template_statement(cell_mapper.template, item_parsed, value_parsed, qualifiers_parsed, references_parsed, sparql_endpoint)
                    if statement:
                        statement_data.append(
                            {'cell': cell, 
                            'statement': statement})
        except T2WMLException as exception:
            error = exception.error_dict
            highlight_data['error'][to_excel(col, row)] = error
    if highlight_data["error"]:
        raise T2WMLExceptions.InvalidT2WMLExpressionException(message=str(highlight_data["error"])) #TODO: return this properly, not as a str(dict)
    highlight_data['dataRegion'] = list(highlight_data['dataRegion'])
    highlight_data['item'] = list(highlight_data['item'])
    highlight_data['qualifierRegion'] = list(highlight_data['qualifierRegion'])
    highlight_data['referenceRegion'] = list(highlight_data['referenceRegion'])

    if cell_mapper.use_cache:
        cell_mapper.cacher.save(highlight_data, statement_data)
    return highlight_data


def resolve_cell(cell_mapper, col, row):
    sparql_endpoint=cell_mapper.sparql_endpoint
    context={"t_var_row":int(row), "t_var_col":char_dict[col]}
    try:
        item_parsed, value_parsed, qualifiers_parsed, references_parsed= evaluate_template(cell_mapper.eval_template, context)
        statement=get_template_statement(cell_mapper.template, item_parsed, value_parsed, qualifiers_parsed, references_parsed, sparql_endpoint)
        if statement:
            data = {'statement': statement, 'error': None}
        else:
            data = {'statement': None, 'error': "Item doesn't exist"}
    except T2WMLException as exception:
        error = exception.error_dict
        data = {'error': error}
    return data



def generate_download_file(cell_mapper, filetype):
    sparql_endpoint=cell_mapper.sparql_endpoint
    response=dict()
    data=[]
    error=[]

    if cell_mapper.use_cache:
        data=cell_mapper.cacher.get_download()

    if not data:
        
        for col, row in cell_mapper.region:
            try:
                context={"t_var_row":row, "t_var_col":col}
                item_parsed, value_parsed, qualifiers_parsed, references_parsed= evaluate_template(cell_mapper.eval_template, context)
                statement=get_template_statement(cell_mapper.template, item_parsed, value_parsed, qualifiers_parsed, references_parsed, sparql_endpoint)
                if statement:
                    data.append(
                        {'cell': to_excel(col-1, row-1), 
                        'statement': statement})
            except T2WMLException as e:
                error.append({'cell': to_excel(col, row), 
                'error': str(e)})


    if filetype == 'json':
        response["data"] = json.dumps(data, indent=3)
        response["error"] = error
        return response
    
    elif filetype == 'ttl':
        response["data"] = generate_triples("n/a", data, sparql_endpoint, created_by=cell_mapper.created_by)
        response["error"] = error
        return response
