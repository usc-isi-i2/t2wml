import json
from pathlib import Path
import requests
import csv
from typing import Sequence
from backend_code.item_table import ItemTable
from backend_code import t2wml_exceptions as T2WMLExceptions
from backend_code.bindings import bindings
from backend_code.utility_functions import translate_precision_to_integer, get_property_type
from backend_code.spreadsheets.conversions import cell_range_str_to_tuples, cell_tuple_to_str
from backend_code.t2wml_parser import get_cell
from backend_code.triple_generator import generate_triples
from backend_code.grammar import ItemExpression, ValueExpression, BooleanEquation, ColumnExpression, RowExpression
from backend_code.spreadsheets.utilities import add_excel_file_to_bindings, create_temporary_csv_file
from etk.wikidata.utils import parse_datetime_string
import pandas as pd



def update_bindings(item_table: ItemTable, region: dict = None, excel_filepath: str = None,
                    sheet_name: str = None) -> None:
    """
    This function updates the bindings dictionary with the region, excel_file and item_table
    :param item_table:
    :param region:
    :param excel_filepath:
    :param sheet_name:
    :return:
    """
    if region:
        bindings["$left"] = region['left']
        bindings["$right"] = region['right']
        bindings["$top"] = region['top']
        bindings["$bottom"] = region['bottom']
    if excel_filepath:
        add_excel_file_to_bindings(excel_filepath, sheet_name)
    bindings["item_table"] = item_table


def handle_variables(v):
    if v.variables:
        variables = list(v.variables)
        num_of_variables = len(variables)
        if num_of_variables == 1:
            bindings[variables[0]] = 0
            if isinstance(v, (ItemExpression, ValueExpression, BooleanEquation)):
                while not v.evaluate(bindings):
                    bindings[variables[0]] += 1
            col, row, _value = v.evaluate_and_get_cell(bindings)
            del bindings[variables[0]]
    else:
        col, row, _value = v.evaluate_and_get_cell(bindings)
    return col, row, _value

def highlight_region(item_table: ItemTable, excel_data_filepath: str, sheet_name: str, region_specification: dict,
                     template: dict) -> dict:
    """
    This function add holes in the region_object and builds up the list of data_region, item_region and qualifier_region
    :param item_table:
    :param excel_data_filepath:
    :param sheet_name:
    :param region_specification:
    :param template:
    :return:
    """
    update_bindings(item_table, region_specification, excel_data_filepath, sheet_name)
    region = region_specification['region_object']
    head = region.get_head()
    data = {"dataRegion": set(), "item": set(), "qualifierRegion": set(), 'error': dict()}
    bindings["$col"] = head[0]
    bindings["$row"] = head[1]
    try:
        item = template['item']
    except KeyError:
        item = None

    try:
        qualifiers = template['qualifier']
    except KeyError:
        qualifiers = None

    while region.sheet.get((bindings["$col"], bindings["$row"]), None) is not None:
        try:
            data_cell = cell_tuple_to_str((bindings["$col"], bindings["$row"]))
            data["dataRegion"].add(data_cell)
            if item and isinstance(item, (ItemExpression, ValueExpression, BooleanEquation)):
                try:
                    if item.variables:
                        col, row, value = handle_variables(item)
                        item_cell = cell_tuple_to_str((col, row))
                        data["item"].add(item_cell)
                    else:
                        item_cell = get_cell(item)
                        item_cell = cell_tuple_to_str(item_cell)
                        data["item"].add(item_cell)
                except AttributeError:
                    pass
            elif item and isinstance(item, (ColumnExpression, RowExpression)):
                try:
                    item_cell = get_cell(item)
                    item_cell = cell_tuple_to_str(item_cell)
                    data["item"].add(item_cell)
                except AttributeError:
                    pass

            if qualifiers:
                qualifier_cells = set()
                for qualifier in qualifiers:
                    if isinstance(qualifier["value"], (ItemExpression, ValueExpression, BooleanEquation)):
                        try:
                            if qualifier["value"].variables:
                                variables = list(qualifier["value"].variables)
                                num_of_variables = len(variables)
                                if num_of_variables == 1:
                                    bindings[variables[0]] = 0
                                    while not qualifier["value"].evaluate(bindings):
                                        bindings[variables[0]] += 1
                                    col, row, value = qualifier["value"].evaluate_and_get_cell(bindings)
                                    qualifier_cell = cell_tuple_to_str((col, row))
                                    qualifier_cells.add(qualifier_cell)
                                    del bindings[variables[0]]
                            else:
                                qualifier_cell = get_cell(qualifier["value"])
                                qualifier_cell = cell_tuple_to_str(qualifier_cell)
                                qualifier_cells.add(qualifier_cell)
                        except AttributeError:
                            pass
                    elif isinstance(qualifier["value"], (ColumnExpression, RowExpression)):
                        try:
                            qualifier_cell = get_cell(qualifier["value"])
                            qualifier_cell = cell_tuple_to_str(qualifier_cell)
                            qualifier_cells.add(qualifier_cell)
                        except AttributeError:
                            pass
                data["qualifierRegion"] |= qualifier_cells
        except Exception as exception:
            error = dict()
            error["errorCode"], error["errorTitle"], error["errorDescription"] = exception.args
            data['error'][cell_tuple_to_str((bindings["$col"], bindings["$row"]))] = error

        if region.sheet[(bindings["$col"], bindings["$row"])].next is not None:
            bindings["$col"], bindings["$row"] = region.sheet[(bindings["$col"], bindings["$row"])].next
        else:
            bindings["$col"], bindings["$row"] = None, None

    data['dataRegion'] = list(data['dataRegion'])
    data['item'] = list(data['item'])
    data['qualifierRegion'] = list(data['qualifierRegion'])
    return data


def resolve_cell(item_table: ItemTable, excel_data_filepath: str, sheet_name: str, region_specification: dict,
                 template: dict, column: int, row: int, sparql_endpoint: str) -> dict:
    """
    This cell resolve the statement for a particular cell
    :param sparql_endpoint:
    :param item_table:
    :param excel_data_filepath:
    :param sheet_name:
    :param region_specification:
    :param template:
    :param column:
    :param row:
    :return:
    """
    update_bindings(item_table, region_specification, excel_data_filepath, sheet_name)
    region = region_specification['region_object']
    bindings["$col"] = column
    bindings["$row"] = row
    data = {}
    if region.sheet.get((bindings["$col"], bindings["$row"]), None) is not None:
        try:
            statement = evaluate_template(template, sparql_endpoint)
            if statement:
                data = {'statement': statement, 'error': None}
            else:
                data = {'statement': None, 'error': "Item doesn't exist"}
        except Exception as exception:
            error = dict()
            error["errorCode"], error["errorTitle"], error["errorDescription"] = exception.args
            data = {'error': error}
    return data


def generate_download_file(user_id: str, item_table: ItemTable, excel_data_filepath: str, sheet_name: str,
                           region_specification: dict, template: dict, filetype: str, sparql_endpoint: str,
                           created_by: str = 't2wml', debug=False) -> dict:
    """
    This function generates the download files based on the filetype
    :param created_by:
    :param user_id:
    :param item_table:
    :param excel_data_filepath:
    :param sheet_name:
    :param region_specification:
    :param template:
    :param filetype:
    :param sparql_endpoint:
    :return:
    """
    update_bindings(item_table, region_specification, excel_data_filepath, sheet_name)

    region = region_specification['region_object']
    response = dict()

    data = []
    error = []
    head = region.get_head()
    bindings["$col"] = head[0]
    bindings["$row"] = head[1]
    while region.sheet.get((bindings["$col"], bindings["$row"]), None) is not None:
        try:
            statement = evaluate_template(template, sparql_endpoint)
            if statement:
                data.append(
                    {'cell': cell_tuple_to_str((bindings["$col"], bindings["$row"])), 'statement': statement})
        except Exception as e:
            error.append({'cell': cell_tuple_to_str((bindings["$col"], bindings["$row"])), 'error': str(e)})
        if region.sheet[(bindings["$col"], bindings["$row"])].next is not None:
            bindings["$col"], bindings["$row"] = region.sheet[(bindings["$col"], bindings["$row"])].next
        else:
            bindings["$col"], bindings["$row"] = None, None
    if filetype == 'json':
        response["data"] = json.dumps(data, indent=3)
        response["error"] = None
        return response
    elif filetype == 'ttl':
        try:
            response["data"] = generate_triples(user_id, data, sparql_endpoint, filetype, created_by=created_by,
                                                debug=debug)
            response["error"] = None
            return response
        except Exception as e:
            print(e)
            response = {'error': str(e)}
            return response


def wikifier(item_table: ItemTable, region: str, excel_filepath: str, sheet_name: str, flag, context,
             sparql_endpoint) -> dict:
    """
    This function processes the calls to the wikifier service and adds the output to the ItemTable object
    :param sparql_endpoint:
    :param item_table:
    :param region:
    :param excel_filepath:
    :param sheet_name:
    :return:
    """
    if not item_table:
        item_table = ItemTable()
    cell_qnode_map = wikify_region(region, excel_filepath, sheet_name)
    if not context:
        context = '__NO_CONTEXT__'
    cell_qnode_map['context'] = context
    item_table.update_table(cell_qnode_map, excel_filepath, sheet_name, flag)
    # item_table.add_region(region, cell_qnode_map)
    return item_table.serialize_table(sparql_endpoint)


def parse_time_for_dict(response):
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

def evaluate_qualifier(template, sparql_endpoint):
    return_arr=[]
    for i in range(len(template)):
        skip_qualifier = False
        temp_dict = dict()
        for k, v in template[i].items():
            if isinstance(v, (ItemExpression, ValueExpression, BooleanEquation)):
                col, row, _value = handle_variables(v)
                if _value:
                    temp_dict['cell'] = cell_tuple_to_str((col, row))
                    temp_dict[k] = _value
                else:
                    skip_qualifier = True
            else:
                temp_dict[k] = v
        if skip_qualifier:
            temp_dict = None
        else:
            if "property" in temp_dict and get_property_type(temp_dict["property"], sparql_endpoint) == "Time":
                parse_time_for_dict(temp_dict)
            return_arr.append(temp_dict)
    return return_arr

def evaluate_template(template: dict, sparql_endpoint: str) -> dict:
    """
    This function resolves the template by parsing the T2WML expressions
    and replacing them by the class trees of those expressions
    :param sparql_endpoint:
    :param template:
    :return:
    """
    response = dict()
    for key, value in template.items():
        if key == 'qualifier':
            response[key]=evaluate_qualifier(template[key], sparql_endpoint)
        elif isinstance(value, (ItemExpression, ValueExpression, BooleanEquation)):
                col, row, _value = handle_variables(value)
                if key == "item":
                    response['cell'] = cell_tuple_to_str((col, row))
                if isinstance(value, BooleanEquation):
                    response['cell'] = cell_tuple_to_str((col, row))
                if not _value:
                    raise T2WMLExceptions.ItemNotFoundException("Couldn't find item for cell " + cell_tuple_to_str((col, row)))
                else:
                    response[key] = _value
        else:
            response[key] = value

    if get_property_type(response["property"], sparql_endpoint) == "Time":
        parse_time_for_dict(response)

    return response


def call_wikifiy_service(csv_filepath: str, col_offset: int, row_offset: int):
    """
    This function calls the wikifier service and creates a cell to qnode dictionary based on the response
    cell to qnode dictionary = { 'A4': 'Q383', 'B5': 'Q6892' }
    :param csv_filepath:
    :param col_offset:
    :param row_offset:
    :return:
    """
    cell_qnode_map = dict()
    with open(csv_filepath, 'r') as f:
        files = {
            'file': ('', f),
            'format': (None, 'ISWC'),
            'type': (None, 'text/csv'),
            'header': (None, 'False')
        }
        response = requests.post('https://dsbox02.isi.edu:8888/wikifier/wikify', files=files)
    output = None
    if response.status_code == 200:
        data = response.content.decode("utf-8")
        data = json.loads(data)['data']
        data = [x.split(",") for x in data]
        output = pd.DataFrame(data, columns=["column", "row", "item"])
        for index in range(output.shape[0]):
            output.at[index, 'column'] = int(output.at[index, 'column']) + col_offset
            output.at[index, 'row'] = int(output.at[index, 'row']) + row_offset
    return output


def wikify_region(region: str, excel_filepath: str, sheet_name: str = None):
    """
    This function parses the cell range, creates the temporary csv file and calls the wikifier service on that csv
    to get the cell qnode map. cell qnode map is then processed to omit non empty cells and is then returned.
    :param region:
    :param excel_filepath:
    :param sheet_name:
    :return:
    """
    cell_range = cell_range_str_to_tuples(region)
    file_path = create_temporary_csv_file(cell_range, excel_filepath, sheet_name)
    cell_qnode_map = call_wikifiy_service(file_path, cell_range[0][0], cell_range[0][1])
    return cell_qnode_map


def csv_to_dataframe(file_path):
    df = pd.read_csv(file_path)
    return df


def process_wikified_output_file(file_path: str, item_table: ItemTable, data_filepath, sheet_name, context=None):
    df = csv_to_dataframe(file_path)
    item_table.update_table(df, data_filepath, sheet_name)
