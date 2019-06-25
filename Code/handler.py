import pyexcel
import json
import os
from app_config import app
import sys
sys.path.insert(0, app.config['CODE_FOLDER'])
from ItemTable import ItemTable
from bindings import bindings
from YamlParser import YAMLParser
from Region import Region
import utility_functions

import t2wml_parser

__CWD__ = os.getcwd()
__YAML_FILE__ = __CWD__ + "\\Datasets\\table-1a.yaml"
__EXCEL_FILE__ = __CWD__ + "\\Datasets\\homicide_report_total_and_sex.xlsx"
__EXCEL_SHEET_NAME__ = "table-1a"
__WIKIFIED_RESULT__ = __CWD__ + "\\Datasets\\wikified_result.csv"


def add_excel_file_to_bindings() -> None:
	"""
	This function reads the excel file and add the pyexcel object to the bindings
	:return: None
	"""
	try:
		records = pyexcel.get_book(file_name=__EXCEL_FILE__)
		bindings["excel_sheet"] = records[__EXCEL_SHEET_NAME__]
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


def add_holes(region: Region):
	for col in range(bindings["$left"] + 1, bindings["right"]):
		for row in range(bindings["$top"] + 1, bindings["$bottom"]):
			if check_if_empty(bindings['excel_sheet'][re, ce]):
				region.add_hole(row, col, col)


def check_special_characters(string):
	return all(char in string.punctuation for char in string)


def check_if_empty(string: str):
	if string is None or string == "" or check_special_characters(string):
		return True
	return False


def highlight_region(user_id):
	yaml_parser = YAMLParser(os.path.join(app.config['UPLOAD_FOLDER'], user_id + ".yaml"))
	left, right, top, bottom = yaml_parser.get_region()
	bindings["$left"] = utility_functions.get_excel_column_index(left)
	bindings["$right"] = utility_functions.get_excel_column_index(right)
	bindings["$top"] = utility_functions.get_excel_row_index(top)
	bindings["$bottom"] = utility_functions.get_excel_row_index(bottom)
	region = Region(bindings["$left"], bindings["$right"], bindings["$top"], bindings["$bottom"])
	add_holes(region)
	data = {"data_region": [], "item": [], "qualifier_region": []}
	bindings["$col"] = bindings["$left"] + 1
	bindings["$row"] = bindings["$top"] + 1

	item = yaml_parser.get_template_item()
	qualifiers = yaml_parser.get_qualifiers()

	while region.sheet.get((bindings["$col"], bindings["$row"]), None) is not None:
		cell = utility_functions.get_actual_cell_index((bindings["$col"], bindings["$row"]))
		data["data_region"].append(cell)

		item_cell = t2wml_parser.parse_and_get_cell(item)
		cell = utility_functions.get_actual_cell_index(item_cell)
		data["item"].append(cell)

		for qualifier in qualifiers:
			qualifier_cell = t2wml_parser.parse_and_get_cell(qualifier["value"])
			cell = utility_functions.get_actual_cell_index(qualifier_cell)
			data["qualifier_region"].append(cell)

		if region.sheet[(bindings["$col"], bindings["$row"])].next is not None:
			bindings["$col"], bindings["$row"] = region.sheet[(bindings["$col"], bindings["$row"])].next
		else:
			bindings["$col"], bindings["$row"] = None, None
	json_data = json.dumps(data)
	return json_data


def resolve_cell(user_id, column, row):
	yaml_parser = YAMLParser(os.path.join(app.config['UPLOAD_FOLDER'], user_id + ".yaml"))
	add_excel_file_to_bindings()
	add_wikifier_result_to_bindings()
	region = Region(bindings["$left"], bindings["$right"], bindings["$top"], bindings["$bottom"])
	data = []
	bindings["$col"] = column
	bindings["$row"] = row

	if region.sheet.get((bindings["$col"], bindings["$row"]), None) is not None:
		data.append({'row': bindings["$row"], 'column': bindings["$col"], 'statement': yaml_parser.get_template()})

	json_data = json.dumps(data)
	print(json_data)
	return json_data


def main():
	yaml_parser = YAMLParser(__YAML_FILE__)
	left, right, top, bottom = yaml_parser.get_region()
	bindings["$left"] = utility_functions.get_excel_column_index(left)
	bindings["$right"] = utility_functions.get_excel_column_index(right)
	bindings["$top"] = utility_functions.get_excel_row_index(top)
	bindings["$bottom"] = utility_functions.get_excel_row_index(bottom)
	add_excel_file_to_bindings()
	add_wikifier_result_to_bindings()
	region = Region(bindings["$left"], bindings["$right"], bindings["$top"], bindings["$bottom"])
	data = []
	bindings["$col"] = bindings["$left"] + 1
	bindings["$row"] = bindings["$top"] + 1

	while region.sheet.get((bindings["$col"], bindings["$row"]), None) is not None:
		data.append({'row': bindings["$row"], 'column': bindings["$col"], 'statement': yaml_parser.get_template()})
		if region.sheet[(bindings["$col"], bindings["$row"])].next is not None:
			bindings["$col"], bindings["$row"] = region.sheet[(bindings["$col"], bindings["$row"])].next
		else:
			bindings["$col"], bindings["$row"] = None, None
	json_data = json.dumps(data)
	print(json_data)
	return json_data


if __name__ == "__main__":
	main()
