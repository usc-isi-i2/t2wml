from typing import Union
from SPARQLWrapper import SPARQLWrapper, JSON
import string
import pyexcel
import os
import requests
import csv
import re
import uuid
from pathlib import Path
# from Code.property_type_map import property_type_map


def get_column_letter(n: int) -> str:
	"""
	This function converts the column index to column letter
	1 to A,
	5 to E, etc
	:param n:
	:return:
	"""
	string = ""
	while n > 0:
		n, remainder = divmod(n - 1, 26)
		string = chr(65 + remainder) + string
	return string


def get_excel_column_index(column: str) -> int:
	"""
	This function converts an excel column to its respective column index as used by pyexcel package.
	viz. 'A' to 0
	'AZ' to 51
	:param column:
	:return: column index of type int
	"""
	index = 0
	column = column.upper()
	column = column[::-1]
	for i in range(len(column)):
		index += ((ord(column[i]) % 65 + 1)*(26**i))
	return index-1


def get_excel_row_index(row: Union[str, int]) -> int:
	"""
	This function converts an excel row to its respective row index as used by pyexcel package.
	viz. '5' to 1
	10 to 9
	:param row:
	:return: row index of type int
	"""
	return int(row)-1


def get_actual_cell_index(cell_index: tuple) -> str:
	"""
	This function converts the cell notation used by pyexcel package to the cell notation used by excel
	Eg: (0,5) to A6
	:param cell_index: (col, row)
	:return:
	"""
	col = get_column_letter(cell_index[0]+1)
	row = str(cell_index[1] + 1)
	return col+row


def get_property_type(wikidata_property: str, sparql_endpoint: str) -> str:
	"""
	This functions queries the wikidata to find out the type of a wikidata property
	:param wikidata_property:
	:param sparql_endpoint:
	:return:
	"""
	try:
		type = property_type_map[wikidata_property]
	except KeyError:
		query = """SELECT ?type WHERE {
			wd:"""+wikidata_property+""" rdf:type wikibase:Property ;
			wikibase:propertyType ?type .  
		}"""

		sparql = SPARQLWrapper(sparql_endpoint)
		sparql.setQuery(query)
		sparql.setReturnFormat(JSON)
		results = sparql.query().convert()
		try:
			type = results["results"]["bindings"][0]["type"]["value"].split("#")[1]
		except IndexError:
			type = "Property Not Found"
	return type


def excel_to_json(file_path: str, sheet_name: str = None) -> str:
	"""
	This function reads the excel file and converts it to JSON
	:param file_path:
	:param sheet_name:
	:return:
	"""
	book_dict = pyexcel.get_book_dict(file_name=file_path)
	sheet_data = {'columnDefs': [{'headerName': "", 'field': "^", 'pinned': "left"}], 'rowData': []}
	column_index_map = {}

	file_path = file_path.lower()
	is_first_excel = (False, True)[(file_path.endswith(".xls") or file_path.endswith(".xlsx")) and (sheet_name == None)]

	result = dict()
	if not sheet_name:
		result['sheetNames'] = list()
		for sheet in book_dict.keys():
			result['sheetNames'].append(sheet)
		sheet_name = result['sheetNames'][0]

	sheet = book_dict[sheet_name]
	for i in range(len(sheet[0])):
		column = get_column_letter(i+1)
		column_index_map[i+1] = column
		sheet_data['columnDefs'].append({'headerName': column_index_map[i + 1], 'field': column_index_map[i + 1]})
	for row in range(len(sheet)):
		r = {'^': str(row + 1)}
		for col in range(len(sheet[row])):
			r[column_index_map[col+1]] = str(sheet[row][col]).strip()
		sheet_data['rowData'].append(r)

	if is_first_excel:
		result['sheetData'] = dict()
		result['sheetData'][sheet_name] = sheet_data
		return result
	else:
		return sheet_data


def read_file(file_path: str) -> str:
	"""
	This function returns the content of a file
	:param file_path:
	:return:
	"""
	with open(file_path, "r") as f:
		data = f.read()
	return data


def write_file(filepath: str, data: str) -> None:
	"""
	This function writes data to a file which is saved at the specified filepath
	:param filepath:
	:param data:
	:return:
	"""
	with open(filepath, "w") as f:
		f.write(data)
		f.close()


def check_special_characters(text: str) -> bool:
	"""
	This funtion checks if the text is made up of only special characters
	:param text:
	:return:
	"""
	return all(char in string.punctuation for char in str(text))


def check_if_empty(text: str) -> bool:
	"""
	This function checks if the text is empty or has only special characters
	:param text:
	:return:
	"""
	if text is None or str(text).strip() == "" or check_special_characters(text):
		return True
	return False


def translate_precision_to_integer(precision: str) -> int:
	"""
	This function translates the precision value to indexes used by wikidata
	:param precision:
	:return:
	"""
	if isinstance(precision, int):
		return precision
	precision_map = {
		"gigayear": 0,
		"gigayears": 0,
		"100 megayears": 1,
		"100 megayear": 1,
		"10 megayears": 2,
		"10 megayear": 2,
		"megayears": 3,
		"megayear": 3,
		"100 kiloyears": 4,
		"100 kiloyear": 4,
		"10 kiloyears": 5,
		"10 kiloyear": 5,
		"millennium": 6,
		"century": 7,
		"10 years": 8,
		"10 year": 8,
		"years": 9,
		"year": 9,
		"months": 10,
		"month": 10,
		"days": 11,
		"day": 11,
		"hours": 12,
		"hour": 12,
		"minutes": 13,
		"minute": 13,
		"seconds": 14,
		"second": 14
	}
	return precision_map[precision.lower()]


def delete_file(filepath: str) -> None:
	"""
	This function delets a file at the filepath
	:param filepath:
	:return:
	"""
	os.remove(filepath)


def split_cell(cell):
	x = re.search("[0-9]+", cell)
	row_span = x.span()
	col = cell[:row_span[0]]
	row = cell[row_span[0]:]
	return get_excel_column_index(col), get_excel_row_index(row)


def parse_cell_range(cell_range):
	cells = cell_range.split(":")
	start_cell = split_cell(cells[0])
	end_cell = split_cell(cells[1])
	return start_cell, end_cell


def create_temporary_csv_file(cell_range, excel_filepath, sheet_name=None):
	iterator = parse_cell_range(cell_range)
	try:
		records = pyexcel.get_book(file_name=excel_filepath)
		if not sheet_name:
			excel_sheet = records[0]
		else:
			excel_sheet = records[sheet_name]
	except IOError:
		raise IOError('Excel File cannot be found or opened')

	file_name = uuid.uuid4().hex + ".csv"
	file_path = Path.cwd() / "temporary_files" / file_name
	i = 0
	cell_csv_index_map = dict()
	with open(file_path, mode='w', newline='') as temporary_file:
		csv_writer = csv.writer(temporary_file, delimiter=',')
		csv_writer.writerow(['values'])
		for col in range(iterator[0][0], iterator[1][0]+1):
			for row in range(iterator[0][1], iterator[1][1]+1):
				cell_value = excel_sheet[row, col]
				if not check_if_empty(cell_value):
					csv_writer.writerow([cell_value])
					cell_csv_index_map[get_actual_cell_index((col,row))] = ('0', str(i))
	return file_path, cell_csv_index_map


def call_wikifiy_service(csv_filepath):
	files = {
		'file': ('', open(csv_filepath, 'r')),
		'format': (None, 'ISWC'),
		'type': (None, 'text/csv')
	}
	response = requests.post('http://dsbox02.isi.edu:8396/wikify', files=files)
	data = response.content.decode("utf-8")
	data = csv.reader(data.splitlines(), delimiter=',')
	output = list(data)
	csv_index_qnode_map = dict()
	for i in output:
		csv_index_qnode_map[(i[0],i[1])] = i[2]
	return csv_index_qnode_map


def wikify_region(region, excel_filepath, sheet_name=None):
	file_path, cell_csv_index_map = create_temporary_csv_file(region, excel_filepath, sheet_name)
	csv_index_qnode_map = call_wikifiy_service(file_path)
	cell_qnode_map = dict()
	for cell, csv_index in cell_csv_index_map.items():
		cell_qnode_map[cell] = csv_index_qnode_map[csv_index]
	return cell_qnode_map

