import pyexcel
from ItemTable import ItemTable
from bindings import bindings
from YamlParser import YAMLParser
from Region import Region
import utility_functions
import json
import os


__CWD__ = os.getcwd()
__YAML_FILE__ = __CWD__ + "\\Datasets\\table-1a.yaml"
__EXCEL_FILE__ = __CWD__ + "\\Datasets\\homicide_report_total_and_sex.xlsx"
__EXCEL_SHEET_NAME__ = "table-1a"
__WIKIFIED_RESULT__ = __CWD__ + "\\Datasets\\wikified_result.csv"


def add___EXCEL_FILE___to_bindings() -> None:
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


def main():
	yaml_parser = YAMLParser(__YAML_FILE__)
	left, right, top, bottom = yaml_parser.get_region()
	bindings["$left"] = utility_functions.get_excel_column_index(left)
	bindings["$right"] = utility_functions.get_excel_column_index(right)
	bindings["$top"] = utility_functions.get_excel_row_index(top)
	bindings["$bottom"] = utility_functions.get_excel_row_index(bottom)
	add___EXCEL_FILE___to_bindings()
	add_wikifier_result_to_bindings()
	region = Region(bindings["$left"], bindings["$right"], bindings["$top"], bindings["$bottom"])
	data = []
	bindings["$col"] = bindings["$left"] + 1
	bindings["$row"] = bindings["$top"] + 1

	while region.sheet.get((bindings["$col"], bindings["$row"]), None) is not None:
		yaml_parser.resolve_template()
		data.append({'row': bindings["$row"], 'column': bindings["$col"], 'statement': yaml_parser.get_template()})
		if region.sheet[(bindings["$col"], bindings["$row"])].next is not None:
			(bindings["$col"], bindings["$row"]) = region.sheet[(bindings["$col"], bindings["$row"])].next
		else:
			bindings["$col"], bindings["$row"] = None, None
	print(json.dumps(data))


if __name__ == "__main__":
	main()
