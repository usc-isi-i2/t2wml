import pyexcel
import json
from app_config import app
import string
from pathlib import Path
from Code.ItemTable import ItemTable
from Code.bindings import bindings
from Code.YamlParser import YAMLParser
from Code.Region import Region
from Code.utility_functions import get_excel_row_index, get_excel_column_index, get_actual_cell_index, check_if_empty
from Code.t2wml_parser import parse_and_get_cell
from Code.triple_generator import generate_triples

__WIKIFIED_RESULT__ = str(Path.cwd() / "Datasets/wikified_result.csv")


def add_excel_file_to_bindings(user_id: str, sheet_name: str) -> None:
	"""
	This function reads the excel file and add the pyexcel object to the bindings
	:return: None
	"""
	try:
		records = pyexcel.get_book(file_name=app.config["__user_files__"][user_id]["excel"])
		if not sheet_name:
			bindings["excel_sheet"] = records[0]
		else:
			bindings["excel_sheet"] = records[sheet_name]

	except IOError:
		print('Excel File cannot be found or opened')


def add_wikifier_result_to_bindings() -> None:
	"""
	This function creates an object of the wikified result file and adds that object to the bindings
	:return:
	"""
	try:
		item_table = ItemTable()
		item_table.generate_hash_tables(__WIKIFIED_RESULT__, True)
		bindings["item_table"] = item_table
	except IOError:
		print('Wikifier Result File cannot be found or opened')


def add_holes(region: Region) -> None:
	"""
	This functions searches for empty or invalid strings in the region and remove those cells from the region
	:param region:
	:return:
	"""
	for col in range(bindings["$left"] + 1, bindings["$right"]):
		for row in range(bindings["$top"] + 1, bindings["$bottom"]):
			if check_if_empty(str(bindings['excel_sheet'][row, col])):
				region.add_hole(row, col, col)


def highlight_region(user_id: str, sheet_name: str = None) -> str:
	"""
	This function finds the cells with data values and their corresponding cells with the item values and qualifiers
	:param user_id:
	:param sheet_name:
	:return:
	"""
	yaml_parser = YAMLParser(app.config["__user_files__"][user_id]["yaml"])
	left, right, top, bottom = yaml_parser.get_region()
	bindings["$left"] = get_excel_column_index(left)
	bindings["$right"] = get_excel_column_index(right)
	bindings["$top"] = get_excel_row_index(top)
	bindings["$bottom"] = get_excel_row_index(bottom)
	add_excel_file_to_bindings(user_id, sheet_name)
	add_wikifier_result_to_bindings()
	region = Region(bindings["$left"], bindings["$right"], bindings["$top"], bindings["$bottom"])
	add_holes(region)
	head = region.get_head()
	data = {"data_region": set(), "item": set(), "qualifier_region": set(), 'error': dict()}
	bindings["$col"] = head[0]
	bindings["$row"] = head[1]

	item = yaml_parser.get_template_item()
	qualifiers = yaml_parser.get_qualifiers()

	while region.sheet.get((bindings["$col"], bindings["$row"]), None) is not None:
		try:
			data_cell = get_actual_cell_index((bindings["$col"], bindings["$row"]))

			item_cell = parse_and_get_cell(item)
			item_cell = get_actual_cell_index(item_cell)

			qualifier_cells = set()
			for qualifier in qualifiers:
				qualifier_cell = parse_and_get_cell(qualifier["value"])
				qualifier_cell = get_actual_cell_index(qualifier_cell)
				qualifier_cells.add(qualifier_cell)

			data["data_region"].add(data_cell)
			data["item"].add(item_cell)
			data["qualifier_region"] |= qualifier_cells
		except Exception as e:
			data['error'][get_actual_cell_index((bindings["$col"], bindings["$row"]))] = str(e)

		if region.sheet[(bindings["$col"], bindings["$row"])].next is not None:
			bindings["$col"], bindings["$row"] = region.sheet[(bindings["$col"], bindings["$row"])].next
		else:
			bindings["$col"], bindings["$row"] = None, None

	data['data_region'] = list(data['data_region'])
	data['item'] = list(data['item'])
	data['qualifier_region'] = list(data['qualifier_region'])
	json_data = json.dumps(data)
	return json_data


def resolve_cell(user_id: str, column: str, row: str, sheet_name: str = None) -> str:
	"""
	This function evaluates the yaml file for this column and row
	:param user_id:
	:param column:
	:param row:
	:param sheet_name:
	:return:
	"""
	yaml_parser = YAMLParser(app.config["__user_files__"][user_id]["yaml"])
	left, right, top, bottom = yaml_parser.get_region()
	bindings["$left"] = get_excel_column_index(left)
	bindings["$right"] = get_excel_column_index(right)
	bindings["$top"] = get_excel_row_index(top)
	bindings["$bottom"] = get_excel_row_index(bottom)
	add_excel_file_to_bindings(user_id, sheet_name)
	add_wikifier_result_to_bindings()
	region = Region(bindings["$left"], bindings["$right"], bindings["$top"], bindings["$bottom"])
	add_holes(region)
	bindings["$col"] = column
	bindings["$row"] = row
	data = {}
	if region.sheet.get((bindings["$col"], bindings["$row"]), None) is not None:
		try:
			statement = yaml_parser.get_template()
			data = {'statement': statement}
		except Exception as e:
			data = {'error': str(e)}
	json_data = json.dumps(data)
	return json_data


def generate_download_file(user_id: str, filetype: str, sheet_name: str = None) -> str:
	"""
	This function evaluets the yaml file for all the cells in the region
	and generates the output in json or in the form of rdf triples
	:param user_id:
	:param filetype:
	:param sheet_name:
	:return:
	"""
	yaml_parser = YAMLParser(app.config["__user_files__"][user_id]["yaml"])
	left, right, top, bottom = yaml_parser.get_region()
	bindings["$left"] = get_excel_column_index(left)
	bindings["$right"] = get_excel_column_index(right)
	bindings["$top"] = get_excel_row_index(top)
	bindings["$bottom"] = get_excel_row_index(bottom)
	add_excel_file_to_bindings(user_id, sheet_name)
	add_wikifier_result_to_bindings()
	region = Region(bindings["$left"], bindings["$right"], bindings["$top"], bindings["$bottom"])
	add_holes(region)
	data = []
	error = []
	head = region.get_head()
	bindings["$col"] = head[0]
	bindings["$row"] = head[1]
	while region.sheet.get((bindings["$col"], bindings["$row"]), None) is not None:
		print(bindings["$col"], bindings["$row"])
		try:
			stat = yaml_parser.get_template()
			data.append({'cell': get_actual_cell_index((bindings["$col"], bindings["$row"])), 'statement': stat})
		except Exception as e:
			error.append({'cell': get_actual_cell_index((bindings["$col"], bindings["$row"])), 'error': str(e)})
		if region.sheet[(bindings["$col"], bindings["$row"])].next is not None:
			bindings["$col"], bindings["$row"] = region.sheet[(bindings["$col"], bindings["$row"])].next
		else:
			bindings["$col"], bindings["$row"] = None, None

	if filetype == 'json':
		json_data = json.dumps(data)
		# filename = user_id + "_output.json"
		# # filepath = str(Path(app.config["DOWNLOAD_FOLDER"]) / filename)
		# filepath = "F:\\isi\\T2WML\\t2wml\\downloads\\output.json"
		# utility_functions.write_file(filepath, json_data)
		return json_data
	elif filetype == 'ttl':
		try:
			json_data = generate_triples(data, filetype)
			# filename = user_id + "_output.ttl"
			# # filepath = str(Path(app.config["DOWNLOAD_FOLDER"]) / filename)
			# filepath = "F:\\isi\\T2WML\\t2wml\\downloads\\output.ttl"
			# utility_functions.write_file(filepath, json_data)
			return json_data
		except Exception as e:
			return str(e)
