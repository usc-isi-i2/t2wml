
import csv
import json
from io import StringIO
from pathlib import Path
import t2wml.utils.t2wml_exceptions as T2WMLExceptions
try:
    from t2wml.mapping.triple_generator import generate_triples
except ImportError:
    def generate_triplets(*args, **kwargs):
        raise ImportError("Missing optional dependency 'etk'. Install etk to enable triplet generation")
from t2wml.wikification.utility_functions import get_property_type


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
        result_dict["node2;kgtk:globe"]=property_dict.get("globe", "")

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

        elif property_type in ["String", "MonolingualText", "ExternalIdentifier", "Url"]:
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

def create_kgtk(data, file_path, sheet_name):
    file_name=Path(file_path).name

    file_extension=Path(file_path).suffix
    if file_extension==".csv":
        sheet_name=""
    else:
        sheet_name= "."+sheet_name

    tsv_data=[]
    for cell in data:
        try:
            statement=data[cell]
            id = file_name + sheet_name + ";" + cell
            cell_result_dict=dict(id=id, node1=statement["item"], label=statement["property"])
            kgtk_add_property_type_specific_fields(statement, cell_result_dict)
            tsv_data.append(cell_result_dict)

            qualifiers=statement.get("qualifier", [])
            for qualifier in qualifiers:
                #commented out. for now, do not generate an id at all for qualifier edges.
                #second_cell=qualifier.get("cell", "")
                #q_id = file_name + "." + sheet_name + ";" + cell +";"+second_cell
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


def get_file_output_from_statements(knowledge_graph, filetype):
    data=knowledge_graph.statements
    file_path=knowledge_graph.metadata.get("data_file", "")
    sheet_name=knowledge_graph.metadata.get("sheet_name", "")
    created_by=knowledge_graph.metadata.get("created_by", "")

    if filetype == 'json':
        output = json.dumps(data, indent=3, sort_keys=False) #insertion-ordered
    elif filetype == 'ttl':
        output = generate_triples("n/a", data, created_by=created_by)
    elif filetype in ["kgtk", "tsv"]:
        output = create_kgtk(data, file_path, sheet_name)
    else:
        raise T2WMLExceptions.FileTypeNotSupportedException("No support for "+filetype+" format")
    return output
