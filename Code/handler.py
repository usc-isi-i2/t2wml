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
from Code.utility_functions import get_actual_cell_index, check_if_empty, parse_cell_range
from Code.t2wml_parser import get_cell
from Code.triple_generator import generate_triples
from Code.ItemExpression import ItemExpression
from Code.ValueExpression import ValueExpression
from Code.BooleanEquation import BooleanEquation
from Code.ColumnExpression import ColumnExpression
from Code.RowExpression import RowExpression
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


def remove_empty_and_invalid_cells(region: Region) -> None:
	"""
	This functions searches for empty or invalid strings in the region and remove those cells from the region
	:param region:
	:return:
	"""
	for col in range(bindings["$left"] + 1, bindings["$right"]):
		for row in range(bindings["$top"] + 1, bindings["$bottom"]):
			if check_if_empty(str(bindings['excel_sheet'][row, col])):
				region.add_hole(row, col, col)


def update_bindings(item_table: ItemTable, region: dict = None, excel_filepath: str = None, sheet_name: str = None) -> None:
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


def highlight_region(item_table: ItemTable, excel_data_filepath: str, sheet_name: str, region_specification: dict, template: dict) -> str:
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
	remove_empty_and_invalid_cells(region)
	head = region.get_head()
	data = {"data_region": set(), "item": set(), "qualifier_region": set(), 'error': dict()}
	bindings["$col"] = head[0]
	bindings["$row"] = head[1]
	holes = []
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
			row_be_skipped = False
			column_be_skipped = False
			cell_be_skipped = False
			if region_specification['skip_row']:
				for i in range(len(region_specification['skip_row'])):
					row_be_skipped = row_be_skipped or region_specification['skip_row'][i].evaluate(bindings)

			if region_specification['skip_column']:
				for i in range(len(region_specification['skip_column'])):
					column_be_skipped = column_be_skipped or region_specification['skip_column'][i].evaluate(bindings)

			if region_specification['skip_cell']:
				for i in range(len(region_specification['skip_cell'])):
					cell_be_skipped = cell_be_skipped or region_specification['skip_cell'][i].evaluate(bindings)

			if not row_be_skipped and not column_be_skipped and not cell_be_skipped:
				data_cell = get_actual_cell_index((bindings["$col"], bindings["$row"]))
				data["data_region"].add(data_cell)

				if item and isinstance(item, (ItemExpression, ValueExpression, BooleanEquation, ColumnExpression, RowExpression)):
					try:
						item_cell = get_cell(item)
						item_cell = get_actual_cell_index(item_cell)
						data["item"].add(item_cell)
					except AttributeError:
						pass

				if qualifiers:
					qualifier_cells = set()
					for qualifier in qualifiers:
						if isinstance(qualifier["value"], (ItemExpression, ValueExpression, BooleanEquation, ColumnExpression, RowExpression)):
							try:
								qualifier_cell = get_cell(qualifier["value"])
								qualifier_cell = get_actual_cell_index(qualifier_cell)
								qualifier_cells.add(qualifier_cell)
							except AttributeError:
								pass
					data["qualifier_region"] |= qualifier_cells
			else:
				holes.append((bindings["$row"], bindings["$col"]))
		except Exception as e:
			data['error'][get_actual_cell_index((bindings["$col"], bindings["$row"]))] = str(e)

		if region.sheet[(bindings["$col"], bindings["$row"])].next is not None:
			bindings["$col"], bindings["$row"] = region.sheet[(bindings["$col"], bindings["$row"])].next
		else:
			bindings["$col"], bindings["$row"] = None, None

	data['data_region'] = list(data['data_region'])
	data['item'] = list(data['item'])
	data['qualifier_region'] = list(data['qualifier_region'])

	for cell_index in holes:
		region.add_hole(cell_index[0], cell_index[1], cell_index[1])

	return data


def resolve_cell(item_table: ItemTable, excel_data_filepath: str, sheet_name: str, region_specification: dict, template: dict, column: str, row: str) -> str:
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
			statement = evaluate_template(template)
			data = {'statement': statement}
		except Exception as e:
			data = {'error': str(e)}
	json_data = json.dumps(data)
	return json_data


def generate_download_file(user_id: str, item_table: ItemTable, excel_data_filepath: str, sheet_name: str, region_specification: dict, template: dict, filetype: str, sparql_endpoint: str) -> str:
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
	response = []
	error = []
	head = region.get_head()
	bindings["$col"] = head[0]
	bindings["$row"] = head[1]
	while region.sheet.get((bindings["$col"], bindings["$row"]), None) is not None:
		try:
			statement = evaluate_template(template)
			response.append({'cell': get_actual_cell_index((bindings["$col"], bindings["$row"])), 'statement': statement})
		except Exception as e:
			error.append({'cell': get_actual_cell_index((bindings["$col"], bindings["$row"])), 'error': str(e)})
		if region.sheet[(bindings["$col"], bindings["$row"])].next is not None:
			bindings["$col"], bindings["$row"] = region.sheet[(bindings["$col"], bindings["$row"])].next
		else:
			bindings["$col"], bindings["$row"] = None, None
	if filetype == 'json':
		json_response = json.dumps(response, indent=3)
		return json_response
	elif filetype == 'ttl':
		try:
			json_response = generate_triples(user_id, response, sparql_endpoint, filetype)
			return json_response
		except Exception as e:
			return str(e)


def wikifier(item_table: ItemTable, region: str, excel_filepath: str, sheet_name: str) -> dict:
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
	item_table.add_region(region, cell_qnode_map)
	return item_table.get_region_qnodes()


def load_yaml_data(yaml_filepath: str) -> Sequence[dict]:
	"""
	This function loads the YAML file data, parses different expressions and generates the statement
	:param yaml_filepath:
	:return:
	"""
	yaml_parser = YAMLParser(yaml_filepath)
	region = yaml_parser.get_region()
	region['region_object'] = Region(region["left"], region["right"], region["top"], region["bottom"])
	template = yaml_parser.get_template()
	return region, template


def build_item_table(item_table: ItemTable, wikifier_output_filepath: str, excel_data_filepath: str, sheet_name: str) -> ItemTable:
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


def evaluate_template(template: dict) -> dict:
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
				temp_dict = dict()
				for k, v in template[key][i].items():
					if isinstance(v, (ItemExpression, ValueExpression, BooleanEquation)):
						col, row, temp_dict[k] = v.evaluate_and_get_cell(bindings)
						temp_dict['cell'] = get_actual_cell_index((col, row))
					else:
						temp_dict[k] = v
				response[key].append(temp_dict)
		else:
			if isinstance(value, (ItemExpression, ValueExpression, BooleanEquation)):
				col, row, response[key] = value.evaluate_and_get_cell(bindings)
				if key == "item":
					response['cell'] = get_actual_cell_index((col, row))
			else:
				response[key] = value
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
		sheet = pyexcel.get_sheet(sheet_name=sheet_name, file_name=excel_filepath, start_row=cell_range[0][1], row_limit=cell_range[1][1] - cell_range[0][1] + 1, start_column=cell_range[0][0], column_limit=cell_range[1][0] - cell_range[0][0] + 1)
		pyexcel.save_as(array=sheet, dest_file_name=file_path)
	except IOError:
		raise IOError('Excel File cannot be found or opened')
	return file_path


def call_wikifiy_service(csv_filepath: str, col_offset: int, row_offset: int) -> dict:
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
	response = requests.post('http://dsbox02.isi.edu:8397/wikify', files=files)
	if response.status_code == 200:
		data = response.content.decode("utf-8")
		data = csv.reader(data.splitlines(), delimiter=',')
		output = list(data)
		for i in output:
			cell_qnode_map[get_actual_cell_index((int(i[0]) + col_offset, int(i[1]) + row_offset))] = i[2]
	return cell_qnode_map


def wikify_region(region: str, excel_filepath: str, sheet_name: str = None) -> dict:
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
	response = dict()
	sheet = pyexcel.get_sheet(sheet_name=sheet_name, file_name=excel_filepath)
	for col in range(cell_range[0][0], cell_range[1][0]+1):
		for row in range(cell_range[0][1], cell_range[1][1] + 1):
			try:
				cell_index = get_actual_cell_index((col, row))
				if not check_if_empty(sheet[row, col]):
					if cell_index in cell_qnode_map:
						response[cell_index] = cell_qnode_map[cell_index]
					else:
						response[cell_index] = ""
			except IndexError:
				pass
			except KeyError:
				pass
	return response
