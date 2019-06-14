import pyexcel
from ItemTable import ItemTable
from bindings import bindings
from YamlParser import YAMLParser
from Region import Region
import utility_functions
from collections import OrderedDict
import os


__CWD__ = os.getcwd()
YAML_FILE = __CWD__ + "\\Datasets\\table-1a.yaml"
EXCEL_FILE = __CWD__ + "\\Datasets\\homicide_report_total_and_sex.xlsx"
EXCEL_SHEET_NAME = "table-1a"
WIKIFIED_RESULT = __CWD__ + "\\Datasets\\wikified_result.csv"


def add_excel_file_to_bindings() -> None:
	"""
	This function reads the excel file and add the pyexcel object to the bindings
	:return: None
	"""
	try:
		records = pyexcel.get_book(file_name=EXCEL_FILE)
		bindings["excel_sheet"] = records[EXCEL_SHEET_NAME]
	except IOError:
		print('Excel File cannot be found or opened')


def add_wikifier_result_to_bindings() -> None:
	"""
	This function creates an object of the wikified result file and adds that object to the bindings
	:return:
	"""
	try:
		item_table = ItemTable()
		item_table.generate_hash_tables(WIKIFIED_RESULT, True)
		bindings["item_table"] = item_table
	except IOError:
		print('Wikifier Result File cannot be found or opened')


def main():
	yaml_parser = YAMLParser(YAML_FILE)
	left, right, top, bottom = yaml_parser.get_region()
	bindings["$left"] = utility_functions.get_excel_column_index(left)
	bindings["$right"] = utility_functions.get_excel_column_index(right)
	bindings["$top"] = utility_functions.get_excel_row_index(top)
	bindings["$bottom"] = utility_functions.get_excel_row_index(bottom)
	add_excel_file_to_bindings()
	add_wikifier_result_to_bindings()
	region = Region(bindings["$left"], bindings["$right"], bindings["$top"], bindings["$bottom"])
	data = OrderedDict()
	bindings["$col"] = bindings["$left"] + 1
	bindings["$row"] = bindings["$top"] + 1

	# print(region.sheet[(5,8)].next)
	# return
	while region.sheet.get((bindings["$col"], bindings["$row"]), None) is not None:

		yaml_parser.resolve_template()
		data[(bindings["$col"], bindings["$row"])] = yaml_parser.get_template_in_json()
		if region.sheet[(bindings["$col"], bindings["$row"])].next is not None:
			bindings["$col"], bindings["$row"] = region.sheet[(bindings["$col"], bindings["$row"])].next
		else:
			bindings["$col"], bindings["$row"] = None, None
		print(bindings["$col"], bindings["$row"])
		# break
	print(data)


if __name__ == "__main__":
	main()
