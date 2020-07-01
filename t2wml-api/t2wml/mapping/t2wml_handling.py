import csv
import json
import warnings
import sys
from copy import deepcopy
from io import StringIO
from pathlib import Path
from collections import defaultdict
from etk.wikidata.utils import parse_datetime_string
from SPARQLWrapper.SPARQLExceptions import QueryBadFormed

from t2wml.utils.t2wml_exceptions import T2WMLException
import t2wml.utils.t2wml_exceptions as T2WMLExceptions
from t2wml.parsing.classes import ReturnClass
from t2wml.parsing.constants import char_dict
from t2wml.parsing.t2wml_parsing import iter_on_n_for_code, T2WMLCode
from t2wml.spreadsheets.conversions import to_excel

from t2wml.mapping.triple_generator import generate_triples
from t2wml.wikification.utility_functions import translate_precision_to_integer
from t2wml.wikification.utility_functions import get_property_type as _get_property_type

not_found_cache=set()
property_cache=dict()


def get_property_type(prop):
    try:
        if prop in not_found_cache:
            raise T2WMLExceptions.MissingWikidataEntryException("Property not found:" +str(prop))
        prop_type=property_cache.get(prop, None)
        if not prop_type:
            prop_type= _get_property_type(prop)
            property_cache[prop]=prop_type
        return prop_type
    except QueryBadFormed:
        raise T2WMLExceptions.MissingWikidataEntryException("The value given for property is not a valid property:" +str(prop))
    except ValueError:
        not_found_cache.add(prop)
        raise T2WMLExceptions.MissingWikidataEntryException("Property not found:" +str(prop))



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

def get_template_statement(cell_mapper, context):
    parsed_template=dict()
    errors=dict()
    for key in cell_mapper.template:
        try:
            entry_parsed, inner_errors=_parse_template(cell_mapper.eval_template[key], context)
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
    
    
def get_all_template_statements(cell_mapper):
    statements={}
    errors={}
    for col, row in cell_mapper.region:
        cell=to_excel(col-1, row-1)
        context={"t_var_row":row, "t_var_col":col}
        try:
            statement, inner_errors=get_template_statement(cell_mapper, context)
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
    return statements, errors




                



def resolve_cell(cell_mapper, col, row):
    context={"t_var_row":int(row), "t_var_col":char_dict[col]}
    try:
        statement, errors=get_template_statement(cell_mapper, context)
        data = {'statement': statement, 'internalErrors': errors if errors else None, "error":None}
    except T2WMLExceptions.TemplateDidNotApplyToInput as e:
        data=dict(error=e.errors)
    except T2WMLException as e:
        data=dict(error=e.error_dict)
    return data





def enclose_in_quotes(value):
    if value != "" and value is not None:
        return "\""+str(value)+"\""
    return ""

def kgtk_add_property_type_specific_fields(property_dict, result_dict):
    property_type= get_property_type(property_dict["property"])
    
    #The only property that doesn't require value
    if property_type=="GlobeCoordinate": 
        '''
        node2;kgtk:latitude: for coordinates, the latitude
        node2;kgtk:longitude: for coordinates, the longitude
        '''
        result_dict["node2;kgtk:data_type"]="coordinate" #not defined for sure yet
        result_dict["node2;kgtk:latitude"]=property_dict["latitude"]
        result_dict["node2;kgtk:longitude"]=property_dict["longitude"]
        result_dict["node2;kgtk:precision"]=property_dict.get("precision", "")
        result_dict[" node2;kgtk:globe"]=property_dict.get("globe", "")

    else:
        value=property_dict["value"]

        if property_type=="Quantity":
            '''
            node2;kgtk:magnitude: for quantities, the number
            node2;kgtk:units_node: for quantities, the unit
            node2;kgtk:low_tolerance: for quantities, the lower bound of the value (cannot do it in T2WML yet)
            node2;kgtk:high_tolerance: for quantities, the upper bound of the value (cannot do it in T2WML yet)
            '''
            result_dict["node2;kgtk:data_type"]="quantity"
            result_dict["node2;kgtk:number"]= value
            result_dict["node2;kgtk:units_node"]= property_dict.get("unit", "")
            result_dict["node2;kgtk:low_tolerance"]= property_dict.get("lower-bound", "")
            result_dict["node2;kgtk:high_tolerance"]= property_dict.get("upper-bound", "")

        elif property_type=="Time":
            '''
            node2;kgtk:date_and_time: for dates, the ISO-formatted data
            node2;kgtk:precision: for dates, the precision, as an integer (need to verify this with KGTK folks, could be that we use human readable strings such as year, month
            node2;kgtk:calendar: for dates, the qnode of the calendar, if specified
            '''
            result_dict["node2;kgtk:data_type"]="date_and_times"
            result_dict["node2;kgtk:date_and_time"]=enclose_in_quotes(value)
            result_dict["node2;kgtk:precision"]=property_dict.get("precision", "")
            result_dict["node2;kgtk:calendar"]=property_dict.get("calendar", "")

        elif property_type in ["String", "MonolingualText", "ExternalIdentifier"]:
            '''
            node2;kgtk:text: for text, the text without the language tag
            node2;kgtk:language: for text, the language tag
            '''
            result_dict["node2;kgtk:data_type"]="string"
            result_dict["node2;kgtk:text"]=enclose_in_quotes(value)
            result_dict["node2;kgtk:language"]=enclose_in_quotes(property_dict.get("lang", ""))

        elif property_type in ["WikibaseItem", "WikibaseProperty"]:
            '''
            node2;kgtk:symbol: when node2 is another item, the item goes here"
            '''
            result_dict["node2;kgtk:data_type"]="symbol"
            result_dict["node2;kgtk:symbol"]=value
        
        else:
            raise T2WMLExceptions.UnsupportedPropertyType("Property type "+property_type+" is not currently supported"+ "(" +property_dict["property"] +")")

def create_kgtk(data, file_path, sheet_name, project_name):
    file_name=Path(file_path).stem

    file_extension=Path(file_path).suffix
    if file_extension==".csv":
        sheet_name=""

    tsv_data=[]
    for cell in data:
        try:
            statement=data[cell]
            id = project_name + ";" + file_name + "." + sheet_name + file_extension + ";" + cell
            cell_result_dict=dict(id=id, node1=statement["item"], label=statement["property"])
            kgtk_add_property_type_specific_fields(statement, cell_result_dict)
            tsv_data.append(cell_result_dict)

            qualifiers=statement.get("qualifier", [])
            for qualifier in qualifiers:
                #commented out. for now, do not generate an id at all for qualifier edges.
                #second_cell=qualifier.get("cell", "")
                #q_id = project_name + ";" + file_name + "." + sheet_name + "." + file_extension + ";" + cell +";"+second_cell
                qualifier_result_dict=dict(node1=id, label=qualifier["property"])
                kgtk_add_property_type_specific_fields(qualifier, qualifier_result_dict)
                tsv_data.append(qualifier_result_dict)

            references = statement.get("reference", [])
            #todo: handle references
        except Exception as e:
            raise(e)
        


    string_stream= StringIO("", newline="")
    fieldnames=["id", "node1", "label","node2", "node2;kgtk:data_type",
                "node2;kgtk:number","node2;kgtk:low_tolerance","node2;kgtk:high_tolerance", "node2;kgtk:units_node",
                "node2;kgtk:date_and_time", "node2;kgtk:precision", "node2;kgtk:calendar",
                "node2;kgtk:truth", 
                "node2;kgtk:symbol",
                "node2;kgtk:latitude", "node2;kgtk:longitude",
                "node2;kgtk:text", "node2;kgtk:language", ]

    writer = csv.DictWriter(string_stream, fieldnames,
                            restval="", delimiter="\t", lineterminator="\n",
                            escapechar='', quotechar='',
                            dialect=csv.unix_dialect, quoting=csv.QUOTE_NONE)
    writer.writeheader()
    for entry in tsv_data:
        writer.writerow(entry)
    
    data=string_stream.getvalue()
    string_stream.close()
    return data


def get_file_output_from_data(data, filetype, project_name="", file_path=None, sheet_name=None, created_by="t2wml"):
    if filetype not in ["json", "ttl", "tsv", "kgtk"]:
        raise T2WMLExceptions.FileTypeNotSupportedException("No support for "+filetype+" format")
    if filetype == 'json':
        output = json.dumps(data, indent=3, sort_keys=False) #insertion-ordered
    elif filetype == 'ttl':
        output = generate_triples("n/a", data, created_by=cell_mapper.created_by)
    elif filetype in ["kgkt", "tsv"]:
        output = create_kgtk(data, file_path, sheet_name, project_name)
    return output