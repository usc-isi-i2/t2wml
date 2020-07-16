
import warnings
import sys
from copy import deepcopy
from collections import defaultdict
from etk.wikidata.utils import parse_datetime_string
from t2wml.utils.t2wml_exceptions import T2WMLException
import t2wml.utils.t2wml_exceptions as T2WMLExceptions
from t2wml.parsing.classes import ReturnClass
from t2wml.parsing.constants import char_dict
from t2wml.parsing.t2wml_parsing import iter_on_n_for_code, T2WMLCode
from t2wml.spreadsheets.conversions import to_excel
from t2wml.wikification.utility_functions import translate_precision_to_integer, get_property_type
from t2wml.utils.bindings import update_bindings


def parse_time_for_dict(response):
    if "property" in response:
        prop_type=get_property_type(response["property"])
        if prop_type=="Time":
            if "format" in response:
                with warnings.catch_warnings(record=True) as w: #use this line to make etk stop harassing us with "no lang features detected" warnings
                    try:
                        datetime_string, precision = parse_datetime_string(
                            str(response["value"]),
                            additional_formats= [response["format"]],
                            prefer_language_date_order = False 
                            )

                    except ValueError:
                        raise T2WMLExceptions.BadDateFormatException("Attempting to parse datetime string that isn't a datetime:" + str(response["value"]))

                    if "precision" not in response:
                        response["precision"] = int(precision.value.__str__())
                    else:
                        response["precision"] = translate_precision_to_integer(response["precision"])
                    response["value"] = datetime_string



def _parse_template_for_list_of_dicts(attributes, context):
    errors=defaultdict(dict)
    attributes_parsed=[]
    for i, attribute in enumerate(attributes):
        new_dict=dict(attribute)
        for key in attribute:
            try:
                if isinstance(attribute[key], T2WMLCode):
                    q_parsed=iter_on_n_for_code(attribute[key], context)
                    if q_parsed.value is None:
                        new_dict.pop(key)
                        raise ValueError("Failed to resolve for "+key)
                    new_dict[key]=q_parsed
            except Exception as e:
                errors[str(i+1)][key]=str(e)
        attributes_parsed.append(new_dict)

    return attributes_parsed, errors


def _parse_template(entry, context):
    if isinstance(entry, list):
        entry_parsed, errors=_parse_template_for_list_of_dicts(entry, context)
        return entry_parsed, errors
    elif isinstance(entry, T2WMLCode):
        entry_parsed= iter_on_n_for_code(entry, context)
        return entry_parsed, None
    else:
        return entry, None

def get_template_statement(template, context):
    parsed_template=dict()
    errors=dict()
    for key in template.dict_template:
        try:
            entry_parsed, inner_errors=_parse_template(template.eval_template[key], context)
            if inner_errors:
                errors[key]=inner_errors
            parsed_template[key]=entry_parsed
        except Exception as e:
            errors[key]=str(e)
    
    template=dict()
     
    for key in parsed_template:
        if isinstance(parsed_template[key], ReturnClass):
            value=parsed_template[key].value
            if value is None:
                errors[key]="Not found"
            else:
                template[key]=value
        elif isinstance(parsed_template[key], list): #qualifiers
            new_list=[]
            for i, attribute_dict in enumerate(parsed_template[key]):
                new_dict={}
                mini_error_dict={}
                for a_key in attribute_dict:
                    if isinstance(attribute_dict[a_key], ReturnClass):
                        value=attribute_dict[a_key].value
                        if value is None:
                            mini_error_dict[a_key]="Not found"
                        else:
                            new_dict[a_key]=value
                    else:
                        new_dict[a_key]=attribute_dict[a_key]

                #handle value cell
                q_val=attribute_dict.get("value", None)
                if not q_val and not attribute_dict.get("longitude", False) and not attribute_dict.get("latitude", False):
                    pass #don't add a qualifier with no value
                else:
                    try:
                        new_dict["cell"]=to_excel(q_val.col, q_val.row)
                    except AttributeError: #eg hardcoded string
                        pass
                    try:
                        parse_time_for_dict(new_dict)
                    except Exception as e:
                        mini_error_dict['property']=str(e)

                    new_list.append(new_dict)
                if mini_error_dict:
                    if key in errors:
                        errors[key][str(i+1)]=mini_error_dict
                    else:
                        errors[key]={str(i+1):mini_error_dict}
            template[key]=new_list
            
        else:
            template[key]=parsed_template[key]
    
    #handle item cell
    try:
        item_parsed=parsed_template["item"]
        template["item"]=item_parsed.value
        template["cell"]=to_excel(item_parsed.col, item_parsed.row)
    except AttributeError: #eg hardcoded string
        template["item"]=item_parsed
    
    try:
        parse_time_for_dict(template)
    except Exception as e: #we treat this as a critical failure of value
        errors["value"]=str(e)

    if errors:
        #if the problem is in the main value, property, or item, the statement for this cell is too malformed to return the template
        if set(["value", "property", "item"]).intersection(errors.keys()):
            raise T2WMLExceptions.TemplateDidNotApplyToInput(errors=errors)

    return template, errors
    
    
def get_all_template_statements(cell_mapper, sheet, item_table):
    update_bindings(item_table=item_table, sheet=sheet)
    statements={}
    errors={}
    metadata={
        "data_file":sheet.data_file_name,
        "sheet_name":sheet.name,
        "created_by":cell_mapper.created_by
    }
    for col, row in cell_mapper.region:
        cell=to_excel(col-1, row-1)
        context={"t_var_row":row, "t_var_col":col}
        try:
            statement, inner_errors=get_template_statement(cell_mapper.template, context)
            statements[cell]=statement
            if inner_errors:
                errors[cell]=inner_errors
        except T2WMLExceptions.TemplateDidNotApplyToInput as e:
            errors[cell]=e.errors
        except Exception as e:
            errors[cell]=str(e)

    if errors:
        for cell in errors:
            print("error in cell "+ cell+ ": "+str(errors[cell]), file=sys.stderr)
    return statements, errors, metadata



def resolve_cell(cell_mapper, sheet, item_table, col, row):
    '''
    col: a column string character (eg A, B)
    row: resolves to an int (eg '1', 1.0, 1)
    '''
    update_bindings(item_table=item_table, sheet=sheet)
    context={"t_var_row":int(row), "t_var_col":char_dict[col]}
    statement, errors=get_template_statement(cell_mapper.template, context)
    return statement, errors

