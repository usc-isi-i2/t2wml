import pyexcel
import json
from pathlib import Path
import requests
import uuid
import csv
from typing import Sequence
from Code.ItemTable import ItemTable
from Code.bindings import bindings
from Code.YamlParser import YAMLParser
from Code.Region import Region
from Code.utility_functions import get_actual_cell_index, check_if_string_is_invalid, parse_cell_range, \
    translate_precision_to_integer, get_property_type
from Code.t2wml_parser import get_cell
from Code.triple_generator import generate_triples
from Code.ItemExpression import ItemExpression
from Code.ValueExpression import ValueExpression
from Code.BooleanEquation import BooleanEquation
from Code.ColumnExpression import ColumnExpression
from Code.RowExpression import RowExpression
from etk.wikidata.utils import parse_datetime_string
import pandas as pd

__WIKIFIED_RESULT__ = str(Path.cwd() / "Datasets/data.worldbank.org/wikifier.csv")


def add_excel_file_to_bindings(excel_filepath: str, sheet_name: str) -> None:
    """
    This function reads the excel file and add the pyexcel object to the bindings
    :return: None
    """
    try:
        records = pyexcel.get_book(file_name=excel_filepath)
        if not sheet_name:
            bindings["excel_sheet"] = records[0]
        else:
            bindings["excel_sheet"] = records[sheet_name]

    except IOError:
        raise IOError('Excel File cannot be found or opened')


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
            data_cell = get_actual_cell_index((bindings["$col"], bindings["$row"]))
            data["dataRegion"].add(data_cell)
            if item and isinstance(item, (ItemExpression, ValueExpression, BooleanEquation)):
                try:
                    if item.variables:
                        variables = list(item.variables)
                        num_of_variables = len(variables)
                        if num_of_variables == 1:
                            bindings[variables[0]] = 0
                            while not item.evaluate(bindings):
                                bindings[variables[0]] += 1
                            col, row, value = item.evaluate_and_get_cell(bindings)
                            item_cell = get_actual_cell_index((col, row))
                            data["item"].add(item_cell)
                            del bindings[variables[0]]
                    else:
                        item_cell = get_cell(item)
                        item_cell = get_actual_cell_index(item_cell)
                        data["item"].add(item_cell)
                except AttributeError:
                    pass
            elif item and isinstance(item, (ColumnExpression, RowExpression)):
                try:
                    item_cell = get_cell(item)
                    item_cell = get_actual_cell_index(item_cell)
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
                                    qualifier_cell = get_actual_cell_index((col, row))
                                    qualifier_cells.add(qualifier_cell)
                                    del bindings[variables[0]]
                            else:
                                qualifier_cell = get_cell(qualifier["value"])
                                qualifier_cell = get_actual_cell_index(qualifier_cell)
                                qualifier_cells.add(qualifier_cell)
                        except AttributeError:
                            pass
                    elif isinstance(qualifier["value"], (ColumnExpression, RowExpression)):
                        try:
                            qualifier_cell = get_cell(qualifier["value"])
                            qualifier_cell = get_actual_cell_index(qualifier_cell)
                            qualifier_cells.add(qualifier_cell)
                        except AttributeError:
                            pass
                data["qualifierRegion"] |= qualifier_cells
        except Exception as e:
            data['error'][get_actual_cell_index((bindings["$col"], bindings["$row"]))] = str(e)

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
                data = {'statement': None, 'error': 'Item doesn\'t exist'}
        except Exception as e:
            data = {'error': str(e)}
    return data


def generate_download_file(user_id: str, item_table: ItemTable, excel_data_filepath: str, sheet_name: str,
                           region_specification: dict, template: dict, filetype: str, sparql_endpoint: str,
                           created_by: str = 't2wml', debug=False) -> dict:
    """
    This function generates the download files based on the filetype
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
                    {'cell': get_actual_cell_index((bindings["$col"], bindings["$row"])), 'statement': statement})
        except Exception as e:
            error.append({'cell': get_actual_cell_index((bindings["$col"], bindings["$row"])), 'error': str(e)})
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


def load_yaml_data(yaml_filepath: str, item_table: ItemTable, data_file_path: str, sheet_name: str) -> Sequence[dict]:
    """
    This function loads the YAML file data, parses different expressions and generates the statement
    :param yaml_filepath:
    :return:
    """
    yaml_parser = YAMLParser(yaml_filepath)
    update_bindings(item_table, None, data_file_path, sheet_name)
    region = yaml_parser.get_region(bindings)
    region['region_object'] = Region(region, item_table, data_file_path, sheet_name)
    template = yaml_parser.get_template()
    created_by = yaml_parser.get_created_by()
    return region, template, created_by


def build_item_table(item_table: ItemTable, wikifier_output_filepath: str, excel_data_filepath: str,
                     sheet_name: str) -> ItemTable:
    """
    This function builds the ItemTable using the wikified output file uploaded by the user
    :param item_table:
    :param wikifier_output_filepath:
    :param excel_data_filepath:
    :param sheet_name:
    :return:
    """
    if excel_data_filepath:
        item_table.generate_hash_tables(wikifier_output_filepath, excel_data_filepath, sheet_name)
    return item_table


def evaluate_template(template: dict, sparql_endpoint: str) -> dict:
    """
    This function resolves the template by parsing the T2WML expressions
    and replacing them by the class trees of those expressions
    :param template:
    :return:
    """
    response = dict()
    for key, value in template.items():
        if key == 'qualifier':
            response[key] = []
            for i in range(len(template[key])):
                skip_qualifier = False
                temp_dict = dict()
                for k, v in template[key][i].items():
                    if isinstance(v, (ItemExpression, ValueExpression)):
                        if v.variables:
                            variables = list(v.variables)
                            num_of_variables = len(variables)
                            if num_of_variables == 1:
                                bindings[variables[0]] = 0
                                while not v.evaluate_and_get_cell(bindings)[2]:
                                    bindings[variables[0]] += 1
                                col, row, _value = v.evaluate_and_get_cell(bindings)
                                if _value:
                                    temp_dict['cell'] = get_actual_cell_index((col, row))
                                    temp_dict[k] = _value
                                else:
                                    skip_qualifier = True
                                del bindings[variables[0]]
                        else:
                            col, row, _value = v.evaluate_and_get_cell(bindings)
                            if _value:
                                temp_dict['cell'] = get_actual_cell_index((col, row))
                                temp_dict[k] = _value
                            else:
                                skip_qualifier = True
                    elif isinstance(v, BooleanEquation):
                        if v.variables:
                            variables = list(v.variables)
                            num_of_variables = len(variables)
                            if num_of_variables == 1:
                                bindings[variables[0]] = 0
                                while not v.evaluate(bindings):
                                    bindings[variables[0]] += 1
                                col, row, _value = v.evaluate_and_get_cell(bindings)
                                if _value:
                                    temp_dict[k] = _value
                                    temp_dict['cell'] = get_actual_cell_index((col, row))
                                else:
                                    skip_qualifier = True
                                del bindings[variables[0]]
                        else:
                            col, row, _value = v.evaluate_and_get_cell(bindings)
                            if _value:
                                temp_dict[k] = _value
                                temp_dict['cell'] = get_actual_cell_index((col, row))
                            else:
                                skip_qualifier = True
                    else:
                        temp_dict[k] = v
                if skip_qualifier:
                    temp_dict = None
                else:
                    if "property" in temp_dict and get_property_type(temp_dict["property"], sparql_endpoint) == "Time":
                        if "format" in temp_dict:
                            try:
                                datetime_string, precision = parse_datetime_string(temp_dict["value"],
                                                                                   additional_formats=[
                                                                                       temp_dict["format"]])
                                if "precision" not in temp_dict:
                                    temp_dict["precision"] = int(precision.value.__str__())
                                else:
                                    temp_dict["precision"] = translate_precision_to_integer(temp_dict["precision"])
                                temp_dict["value"] = datetime_string
                            except Exception as e:
                                raise e
                    response[key].append(temp_dict)
        else:
            if isinstance(value, (ItemExpression, ValueExpression)):
                if value.variables:
                    variables = list(value.variables)
                    num_of_variables = len(variables)
                    if num_of_variables == 1:
                        bindings[variables[0]] = 0
                        while not value.evaluate_and_get_cell(bindings)[2]:
                            bindings[variables[0]] += 1
                        col, row, _value = value.evaluate_and_get_cell(bindings)
                        del bindings[variables[0]]
                else:
                    col, row, _value = value.evaluate_and_get_cell(bindings)
                if key == "item":
                    response['cell'] = get_actual_cell_index((col, row))
                if not _value:
                    return None
                else:
                    response[key] = _value
            elif isinstance(value, BooleanEquation):
                if value.variables:
                    variables = list(value.variables)
                    num_of_variables = len(variables)
                    if num_of_variables == 1:
                        bindings[variables[0]] = 0
                        while not value.evaluate(bindings):
                            bindings[variables[0]] += 1
                        col, row, _value = value.evaluate_and_get_cell(bindings)
                        response['cell'] = get_actual_cell_index((col, row))
                        del bindings[variables[0]]
                else:
                    col, row, _value = value.evaluate_and_get_cell(bindings)
                    response['cell'] = get_actual_cell_index((col, row))
                if key == "item":
                    response['cell'] = get_actual_cell_index((col, row))
                if not _value:
                    return None
                else:
                    response[key] = _value
            else:
                response[key] = value

    if get_property_type(response["property"], sparql_endpoint) == "Time":
        if "format" in response:
            try:
                datetime_string, precision = parse_datetime_string(response["value"],
                                                                   additional_formats=[response["format"]])
                if "precision" not in response:
                    response["precision"] = int(precision.value.__str__())
                else:
                    response["precision"] = translate_precision_to_integer(response["precision"])
                response["value"] = datetime_string
            except Exception as e:
                raise e
    return response


def create_temporary_csv_file(cell_range: str, excel_filepath: str, sheet_name: str = None) -> str:
    """
    This function creates a temporary csv file of the region which has to be sent to the wikifier service for wikification
    :param cell_range:
    :param excel_filepath:
    :param sheet_name:
    :return:
    """
    file_name = uuid.uuid4().hex + ".csv"
    file_path = str(Path.cwd() / "temporary_files" / file_name)
    try:
        sheet = pyexcel.get_sheet(sheet_name=sheet_name, file_name=excel_filepath, start_row=cell_range[0][1],
                                  row_limit=cell_range[1][1] - cell_range[0][1] + 1, start_column=cell_range[0][0],
                                  column_limit=cell_range[1][0] - cell_range[0][0] + 1)
        pyexcel.save_as(array=sheet, dest_file_name=file_path)
    except IOError:
        raise IOError('Excel File cannot be found or opened')
    return file_path


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
    files = {
        'file': ('', open(csv_filepath, 'r')),
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
    cell_range = parse_cell_range(region)
    file_path = create_temporary_csv_file(cell_range, excel_filepath, sheet_name)
    cell_qnode_map = call_wikifiy_service(file_path, cell_range[0][0], cell_range[0][1])
    return cell_qnode_map


# response = dict()
# sheet = pyexcel.get_sheet(sheet_name=sheet_name, file_name=excel_filepath)
# for col in range(cell_range[0][0], cell_range[1][0]+1):
# 	for row in range(cell_range[0][1], cell_range[1][1] + 1):
# 		try:
# 			cell_index = get_actual_cell_index((col, row))
# 			if not check_if_empty(sheet[row, col]):
# 				if cell_index in cell_qnode_map:
# 					response[cell_index] = cell_qnode_map[cell_index]
# 				else:
# 					response[cell_index] = ""
# 		except IndexError:
# 			pass
# 		except KeyError:
# 			pass
# return response


def csv_to_dataframe(file_path):
    df = pd.read_csv(file_path)
    return df


def process_wikified_output_file(file_path: str, item_table: ItemTable, data_filepath, sheet_name, context=None):
    df = csv_to_dataframe(file_path)
    item_table.update_table(df, data_filepath, sheet_name)
