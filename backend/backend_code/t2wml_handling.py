import csv
import json
import warnings
import sys
from io import StringIO
from pathlib import Path
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



def get_template_statement(template, parsed_template, sparql_endpoint):
    item_parsed=parsed_template.get("item", None)
    if item_parsed:
        try:
            template["item"]=item_parsed.value
            template["cell"]=to_excel(item_parsed.col, item_parsed.row)
        except AttributeError: #eg hardcoded string
             template["item"]=item_parsed
    
    for key in parsed_template:
        if isinstance(parsed_template[key], ReturnClass):
            template[key]=parsed_template[key].value
        elif isinstance(parsed_template[key], list):
            for attribute_dict in parsed_template[key]:
                q_val=attribute_dict.pop("value", None) #deal with value last
                for a_key in attribute_dict:
                    if isinstance(attribute_dict[a_key], ReturnClass):
                        attribute_dict[a_key]=attribute_dict[a_key].value
                
                attribute_dict["value"]=q_val #add q_val back, then deal with it
                if q_val:
                    if isinstance(q_val, ReturnClass):
                        attribute_dict["value"]=q_val.value
                        attribute_dict["cell"]=to_excel(q_val.col, q_val.row)
                parse_time_for_dict(attribute_dict, sparql_endpoint)
            template[key]=parsed_template[key]
        else:
            template[key]=parsed_template[key]

    parse_time_for_dict(template, sparql_endpoint)
    return template


def _evaluate_template_for_list_of_dicts(attributes, context):
    attributes_parsed=[]
    for attribute in attributes:
        new_dict=dict(attribute)
        for key in attribute:
            if isinstance(attribute[key], T2WMLCode):
                q_parsed=iter_on_n_for_code(attribute[key], context)
                new_dict[key]=q_parsed
        attributes_parsed.append(new_dict)
    return attributes_parsed


def evaluate_template(template, context):
    parsed_template=dict(template)
    for key in template:
        if isinstance(template[key], list):
            key_parsed=_evaluate_template_for_list_of_dicts(template[key], context)
        elif isinstance(template[key], T2WMLCode):
            key_parsed=iter_on_n_for_code(template[key], context)
        else:
            key_parsed=template[key]
        parsed_template[key]=key_parsed
    return parsed_template

    
    
def get_all_template_statements(cell_mapper):
    sparql_endpoint=cell_mapper.sparql_endpoint
    statements={}
    errors={}
    for col, row in cell_mapper.region:
        cell=to_excel(col-1, row-1)
        context={"t_var_row":row, "t_var_col":col}
        try:
            parsed_template= evaluate_template(cell_mapper.eval_template, context)
            statement=get_template_statement(cell_mapper.template, parsed_template, sparql_endpoint)
            if statement:
                statements[cell]=statement
            else:
                errors[cell]="Missing (did not resolve to statement)"
        except Exception as e:
            errors[cell]=str(e)

    if errors:
        for cell in errors:
            print("error in cell "+ cell+ ": "+errors[cell], file=sys.stderr)
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
        template_parsed= evaluate_template(cell_mapper.eval_template, context)
        statement=get_template_statement(cell_mapper.template, template_parsed, sparql_endpoint)
        if statement:
            data = {'statement': statement, 'error': None}
        else:
            data = {'statement': None, 'error': "Item doesn't exist"}
    except T2WMLException as exception:
        error = exception.error_dict
        data = {'error': error}
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