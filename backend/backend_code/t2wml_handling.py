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

from backend_code.t2wml_exceptions import T2WMLException, make_frontend_err_dict
import backend_code.t2wml_exceptions as T2WMLExceptions
from backend_code.parsing.classes import ReturnClass
from backend_code.parsing.constants import char_dict
from backend_code.parsing.t2wml_parsing import iter_on_n_for_code, T2WMLCode
from backend_code.spreadsheets.conversions import to_excel

from backend_code.triple_generator import generate_triples
from backend_code.utility_functions import translate_precision_to_integer, get_property_type


def parse_time_for_dict(response, sparql_endpoint):
    if "property" in response:
        try:
            prop_type= get_property_type(response["property"], sparql_endpoint)
        except QueryBadFormed:
            raise T2WMLExceptions.MissingWikidataEntryException("The value given for property is not a valid property:" +str(response["property"]))
        
        if prop_type=="Time":
            if "format" in response:
                with warnings.catch_warnings(record=True) as w: #use this line to make etk stop harassing us with "no lang features detected" warnings
                    try:
                        datetime_string, precision = parse_datetime_string(str(response["value"]),
                                                                            additional_formats=[
                                                                                response["format"]])
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

def get_template_statement(cell_mapper, context, sparql_endpoint):
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
            if not value:
                errors[key]="Not found"
            else:
                template[key]=value
        elif isinstance(parsed_template[key], list):
            new_list=[]
            for i, attribute_dict in enumerate(parsed_template[key]):
                new_dict={}
                mini_error_dict={}
                for a_key in attribute_dict:
                    if isinstance(attribute_dict[a_key], ReturnClass):
                        value=attribute_dict[a_key].value
                        if not value:
                            mini_error_dict[a_key]="Not found"
                        else:
                            new_dict[a_key]=value
                    else:
                        new_dict[a_key]=attribute_dict[a_key]

                #handle value cell
                q_val=attribute_dict.get("value", None)
                try:
                    new_dict["cell"]=to_excel(q_val.col, q_val.row)
                except AttributeError: #eg hardcoded string
                    pass
                try:
                    parse_time_for_dict(new_dict, sparql_endpoint)
                except Exception as e:
                    mini_error_dict['time parsing']=str(e)


                new_list.append(new_dict)
                if mini_error_dict:
                    if key in errors:
                        errors[key][str(i)]=mini_error_dict
                    else:
                        errors[key]={str(i):mini_error_dict}

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
    
    if errors:
        #if the problem is in value, property, or item, the statement for this cell is too malformed to return the template
        if set(["value", "property", "item"]).intersection(errors.keys()):
            raise T2WMLExceptions.TemplateDidNotApplyToInput(errors=errors)
    try:
        parse_time_for_dict(template, sparql_endpoint)
    except Exception as e: #for now we're treating this as critical failure of value, may change to warning
        raise T2WMLExceptions.TemplateDidNotApplyToInput(errors=errors)
    return template, errors
    
    
def get_all_template_statements(cell_mapper):
    sparql_endpoint=cell_mapper.sparql_endpoint
    statements={}
    errors={}
    for col, row in cell_mapper.region:
        cell=to_excel(col-1, row-1)
        context={"t_var_row":row, "t_var_col":col}
        try:
            statement, inner_errors=get_template_statement(cell_mapper, context, sparql_endpoint)
            statements[cell]=statement
            if inner_errors:
                errors[cell]=inner_errors
        except T2WMLExceptions.TemplateDidNotApplyToInput as e:
            errors[cell]=e.errors
        except Exception as e:
            errors[cell]=str(e)

    if errors:
        for cell in errors:
            print("ERROR: error in cell "+ cell+ ": "+str(errors[cell]), file=sys.stderr)
    return statements, errors




                


def highlight_region(cell_mapper):
    if cell_mapper.use_cache:
        highlight_data=cell_mapper.result_cacher.get_highlight_region()
        if highlight_data:
            return highlight_data

    highlight_data = {"dataRegion": set(), "item": set(), "qualifierRegion": set(), 'referenceRegion': set(), 'error': dict()}
    statement_data, errors= get_all_template_statements(cell_mapper)
    for cell in statement_data:
        highlight_data["dataRegion"].add(cell)
        statement = statement_data[cell]
        item_cell=statement.get("cell", None)
        if item_cell:
            highlight_data["item"].add(item_cell)
        qualifiers = statement.get("qualifier", None)
        if qualifiers:
            for qualifier in qualifiers:
                qual_cell=qualifier.get("cell", None)
                if qual_cell:
                    highlight_data["qualifierRegion"].add(qual_cell)
    
        references = statement.get("reference", None)
        if references:
            for ref in references:
                ref_cell=ref.get("cell", None)
                if ref_cell:
                    highlight_data["referenceRegion"].add(ref_cell)



    highlight_data['dataRegion'] = list(highlight_data['dataRegion'])
    highlight_data['item'] = list(highlight_data['item'])
    highlight_data['qualifierRegion'] = list(highlight_data['qualifierRegion'])
    highlight_data['referenceRegion'] = list(highlight_data['referenceRegion'])
    highlight_data['error']=errors

    if cell_mapper.use_cache:
        cell_mapper.result_cacher.save(highlight_data, statement_data, errors)
    return highlight_data


def resolve_cell(cell_mapper, col, row):
    sparql_endpoint=cell_mapper.sparql_endpoint
    context={"t_var_row":int(row), "t_var_col":char_dict[col]}
    try:
        statement, errors=get_template_statement(cell_mapper, context, sparql_endpoint)
        data = {'statement': statement, 'error': errors if errors else None}
    except T2WMLExceptions.TemplateDidNotApplyToInput as e:
        data=dict(error=e.errors)
    except T2WMLException as e:
        data=dict(error=e.error_dict)
    return data



def generate_download_file(cell_mapper, filetype):
    if filetype in ["tsv", "kgtk"]:
        raise ValueError("Please use download_kgtk function to create tsv files for the kgtk format")
    if filetype not in ["json", "ttl"]:
        raise ValueError("Unsupported file type")

    sparql_endpoint=cell_mapper.sparql_endpoint
    response=dict()
    errors=[]
    data=[]
    if cell_mapper.use_cache:
        data=cell_mapper.result_cacher.get_download()
    
    if not data:
        data, errors = get_all_template_statements(cell_mapper)

    if filetype == 'json':
        response["data"] = json.dumps(data, indent=3, sort_keys=False) #insertion-ordered
        response["error"] = None if not errors else errors
        return response
    
    elif filetype == 'ttl':
        response["data"] = generate_triples("n/a", data, sparql_endpoint, created_by=cell_mapper.created_by)
        response["error"] = None #if not errors else errors
        return response


def enclose_in_quotes(value):
    if value != "" and value is not None:
        return "\""+str(value)+"\""
    return ""

def kgtk_add_property_type_specific_fields(property_dict, result_dict, sparql_endpoint):
    property_type= get_property_type(property_dict["property"], sparql_endpoint)
    
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
            result_dict["node2;kgtk:units_node"]= enclose_in_quotes(property_dict.get("unit", ""))
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
            result_dict["node2;kgtk:data_type"]="symbol"
            "node2;kgtk:symbol: when node2 is another item, the item goes here"
            result_dict["node2;kgtk:symbol"]=value
        
        else:
            raise T2WMLExceptions.PropertyTypeNotFound("Property type "+property_type+" is not currently supported"+ "(" +property_dict["property"] +")")

def download_kgtk(cell_mapper, project_name, file_path, sheet_name):
    response=dict()
    errors=[]
    data=[]
    if cell_mapper.use_cache:
        data=cell_mapper.result_cacher.get_download()
    if not data:
        data, errors = get_all_template_statements(cell_mapper)

    file_name=Path(file_path).stem
    file_extension=Path(file_path).suffix

    if file_extension==".csv":
        sheet_name=""

    tsv_data=[]
    for cell in data:
        statement=data[cell]
        id = project_name + ";" + file_name + "." + sheet_name + file_extension + ";" + cell
        cell_result_dict=dict(id=id, node1=statement["item"], label=statement["property"])
        kgtk_add_property_type_specific_fields(statement, cell_result_dict, cell_mapper.sparql_endpoint)
        tsv_data.append(cell_result_dict)

        qualifiers=statement.get("qualifier", [])
        for qualifier in qualifiers:
            #commented out. for now, do not generate an id at all for qualifier edges.
            #second_cell=qualifier.get("cell", "")
            #q_id = project_name + ";" + file_name + "." + sheet_name + "." + file_extension + ";" + cell +";"+second_cell
            qualifier_result_dict=dict(node1=id, label=qualifier["property"])
            kgtk_add_property_type_specific_fields(qualifier, qualifier_result_dict, cell_mapper.sparql_endpoint)
            tsv_data.append(qualifier_result_dict)

        references = statement.get("reference", [])
        #todo: handle references


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
    
    response["data"]=string_stream.getvalue()
    string_stream.close()

    response["error"]=None if not errors else errors
    return response