from SPARQLWrapper import SPARQLWrapper, JSON
import string
import pyexcel
import os
import re
import json
import pickle
from time import time
from uuid import uuid4
from typing import Sequence, Union, Tuple, List, Dict, Any
from google.oauth2 import id_token
from google.auth.transport import requests
from pathlib import Path
from oslo_concurrency import lockutils
import csv
import yaml
from Code.T2WMLException import T2WMLException
# from Code.Project import Project
# from Code.YAMLFile import YAMLFile
from Code.property_type_map import property_type_map
from app_config import GOOGLE_CLIENT_ID, DEFAULT_SPARQL_ENDPOINT


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
		index += ((ord(column[i]) % 65 + 1) * (26 ** i))
	return index - 1


def get_excel_row_index(row: Union[str, int]) -> int:
	"""
	This function converts an excel row to its respective row index as used by pyexcel package.
	viz. '5' to 1
	10 to 9
	:param row:
	:return: row index of type int
	"""
	return int(row) - 1


def get_excel_cell_index(cell: str):
	column = re.search('[a-zA-Z]+', cell).group(0)
	row = re.search('[0-9]+', cell).group(0)
	return get_excel_column_index(column), get_excel_row_index(row)


def get_actual_cell_index(cell_index: tuple) -> str:
	"""
	This function converts the cell notation used by pyexcel package to the cell notation used by excel
	Eg: (0,5) to A6
	:param cell_index: (col, row)
	:return:
	"""
	col = get_column_letter(int(cell_index[0]) + 1)
	row = str(int(cell_index[1]) + 1)
	return col + row


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
			wd:""" + wikidata_property + """ rdf:type wikibase:Property ;
			wikibase:propertyType ?type .
		}"""
		sparql = SPARQLWrapper(sparql_endpoint)
		sparql.setQuery(query)
		sparql.setReturnFormat(JSON)
		results = sparql.query().convert()
		try:
			type = results["results"]["bindings"][0]["type"]["value"].split("#")[1]
			property_type_map[wikidata_property] = type
		except IndexError:
			type = "Property Not Found"

	return type


def add_row_in_data_file(file_path: str, sheet_name: str, destination_path: str = None):
	"""
	This function adds a new blank row at the end of the excel file
	:param destination_path:
	:param file_path:
	:param sheet_name:
	:return:
	"""
	book = pyexcel.get_book(file_name=file_path)
	num_of_cols = len(book[sheet_name][0])
	blank_row = [" "] * num_of_cols
	if book[sheet_name].row[-1] != blank_row:
		book[sheet_name].row += blank_row
	if not destination_path:
		book.save_as(file_path)
	else:
		book.save_as(destination_path)


def excel_to_json(file_path: str, sheet_name: str = None, want_sheet_names: bool = False) -> dict:
	"""
	This function reads the excel file and converts it to JSON
	:param file_path:
	:param sheet_name:
	:param want_sheet_names:
	:return:
	"""
	sheet_data = {'columnDefs': [{'headerName': "", 'field': "^", 'pinned': "left"}], 'rowData': []}
	column_index_map = {}
	result = dict()
	if not sheet_name or want_sheet_names:
		result['sheetNames'] = list()
		book_dict = pyexcel.get_book_dict(file_name=file_path)
		for sheet in book_dict.keys():
			result['sheetNames'].append(sheet)
		if not sheet_name:
			sheet_name = result['sheetNames'][0]
	else:
		result["sheetNames"] = None
	result["currSheetName"] = sheet_name
	add_row_in_data_file(file_path, sheet_name)
	book = pyexcel.get_book(file_name=file_path)
	sheet = book[sheet_name]
	for i in range(len(sheet[0])):
		column = get_column_letter(i + 1)
		column_index_map[i + 1] = column
		sheet_data['columnDefs'].append({'headerName': column_index_map[i + 1], 'field': column_index_map[i + 1]})
	for row in range(len(sheet)):
		r = {'^': str(row + 1)}
		for col in range(len(sheet[row])):
			sheet[row, col] = str(sheet[row, col]).strip()
			r[column_index_map[col + 1]] = sheet[row, col]
		sheet_data['rowData'].append(r)

	result['sheetData'] = sheet_data
	return result


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


def check_special_characters(text: str) -> bool:
	"""
	This function checks if the text is made up of only special characters
	:param text:
	:return:
	"""
	return all(char in string.punctuation for char in str(text))


def check_if_string_is_invalid(text: str) -> bool:
	"""
	This function checks if the text is empty or has only special characters
	:param text:
	:return:
	"""
	if text is None or str(text).strip() == "" or check_special_characters(text) or str(text).strip().lower() == '#n/a':
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
	This function deletes a file at the filepath
	:param filepath:
	:return:
	"""
	os.remove(filepath)


def split_cell(cell: str) -> Sequence[int]:
	"""
	This function parses excel cell indices to column and row indices supported by pyexcel
	For eg: A4 to 0, 3
	B5 to 1, 4
	:param cell:
	:return:
	"""
	x = re.search("[0-9]+", cell)
	row_span = x.span()
	col = cell[:row_span[0]]
	row = cell[row_span[0]:]
	return get_excel_column_index(col), get_excel_row_index(row)


def parse_cell_range(cell_range: str) -> Tuple[Sequence[int], Sequence[int]]:
	"""
	This function parses the cell range and returns the row and column indices supported by pyexcel
	For eg: A4:B5 to (0, 3), (1, 4)
	:param cell_range:
	:return:
	"""
	cells = cell_range.split(":")
	start_cell = split_cell(cells[0])
	end_cell = split_cell(cells[1])
	return start_cell, end_cell


def natural_sort_key(s: str) -> list:
	"""
	This function generates the key for the natural sorting algorithm
	:param s:
	:return:
	"""
	_nsre = re.compile('([0-9]+)')
	return [int(text) if text.isdigit() else text.lower() for text in re.split(_nsre, s)]


def generate_id() -> str:
	"""
	This function generate unique ids
	:return:
	"""
	return uuid4().hex


def add_login_source_in_user_id(user_id: str, login_source: str) -> str:
	"""
	This function appends the login_source key to the user id and returns the new id.
	:param user_id:
	:param login_source:
	:return:
	"""
	if login_source == "Google":
		return "G" + user_id



def verify_google_login(tn: str) -> Tuple[dict, dict]:
	"""
	This function verifies the oauth token by sending a request to Google's server.
	:param tn:
	:return:
	"""
	error = None
	try:
		# client_id = '552769010846-tpv08vhddblg96b42nh6ltg36j41pln1.apps.googleusercontent.com'
		request = requests.Request()
		user_info = id_token.verify_oauth2_token(tn, request, GOOGLE_CLIENT_ID)

		if user_info['iss'] not in ['accounts.google.com', 'https://accounts.google.com']:
			error = dict()
			error["errorCode"] = "T2WMLException.AuthenticationFailure"
			error["errorTitle"] = T2WMLException.AuthenticationFailure.value
			error["errorDescription"] = "Token issued by an invalid issuer"
			user_info = None

	except ValueError as exception:
		user_info = None
		error = dict()
		error["errorCode"] = "T2WMLException.AuthenticationFailure"
		error["errorTitle"] = T2WMLException.AuthenticationFailure.value
		error["errorDescription"] = str(exception)
	return user_info, error


def create_directory(upload_directory: str, uid: str, pid: str = None, ptitle: str = None) -> None:
	"""
	This function creates the project directory along with the project_config.json
	current_working_directory
		|__config/
			|__uploads/
				|__<user_id>/
					|__<project_id>/
					   |__df/
					   |__wf/
					   |__yf/
					   |__project_config.json
	:param upload_directory:
	:param uid:
	:param pid:
	:param ptitle:
	:return:
	"""
	if uid and pid:
		Path(Path(upload_directory) / uid / pid / "df").mkdir(parents=True, exist_ok=True)
		Path(Path(upload_directory) / uid / pid / "wf").mkdir(parents=True, exist_ok=True)
		Path(Path(upload_directory) / uid / pid / "yf").mkdir(parents=True, exist_ok=True)
		with open(Path(upload_directory) / uid / pid / "project_config.json", "w") as file:
			project_config = {
				"pid": pid,
				"ptitle": ptitle,
				"cdate": int(time() * 1000),
				"mdate": int(time() * 1000),
				"sparqlEndpoint": DEFAULT_SPARQL_ENDPOINT,
				"currentDataFile": None,
				"currentSheetName": None,
				"dataFileMapping": dict(),
				"yamlMapping": dict(),
				"wikifierRegionMapping": dict()
			}
			json.dump(project_config, file, indent=3)
	elif uid:
		Path(Path(upload_directory) / uid).mkdir(parents=True, exist_ok=True)


def get_project_details(user_dir: Path) -> dict:
	"""
	This function iterates all the project directories in the user_directory and fetches the project details from the project_config.json
	:param user_dir:
	:return:
	"""
	data = dict()
	if user_dir.exists():
		projects = list()
		error = None
		for project_dir in user_dir.iterdir():
			if project_dir.is_dir():
				with open(str(project_dir / "project_config.json"), "r") as file:
					project_config = json.load(file)
					project_detail = dict()
					project_detail["pid"] = project_config["pid"]
					project_detail["ptitle"] = project_config["ptitle"]
					project_detail["cdate"] = project_config["cdate"]
					project_detail["mdate"] = project_config["mdate"]
					projects.append(project_detail)
	else:
		projects = None
		error = dict()
		error["errorCode"] = "T2WMLException.ProjectsNotFound"
		error["errorTitle"] = T2WMLException.ProjectsNotFound.value
		error['errorDescription'] = "Project directory might have been deleted manually"
	data['projects'] = projects
	data['error'] = error
	return data


def get_region_mapping(uid: str, pid: str, project, data_file_name=None, sheet_name=None) -> Tuple[dict, str]:
	"""
	This function reads (and creates if it doesn't exist) and deserialize the respective wikifier config file
	:param uid:
	:param pid:
	:param project: Project
	:param data_file_name:
	:param sheet_name:
	:return:
	"""
	file_name = project.get_or_create_wikifier_region_filename(data_file_name, sheet_name)
	region_file_path = Path.cwd() / "config" / "uploads" / uid / pid / "wf" / file_name
	region_file_path.touch(exist_ok=True)
	with open(region_file_path) as json_data:
		try:
			region_map = json.load(json_data)
		except json.decoder.JSONDecodeError:
			region_map = None
	return region_map, file_name


def update_wikifier_region_file(uid: str, pid: str, region_filename: str, item_table_as_json: str) -> None:
	"""
	This function updates the wikifier config file. It locks the file while updating to maintain concurrency.
	:param uid:
	:param pid:
	:param region_filename:
	:param region_qnodes:
	:return:
	"""
	file_path = str(Path.cwd() / "config" / "uploads" / uid / pid / "wf" / region_filename)

	@lockutils.synchronized('update_wikifier_region_config', fair=True, external=True,
							lock_path=str(Path.cwd() / "config" / "uploads" / uid / pid / "wf"))
	def update_wikifier_region_config() -> None:
		"""
		This function writes the file
		:return:
		"""
		with open(file_path, 'w') as wikifier_region_config:
			wikifier_region_config.write(item_table_as_json)

	# json.dump(region_qnodes, wikifier_region_config, indent=3)

	update_wikifier_region_config()


def deserialize_wikifier_config(uid: str, pid: str, region_filename: str) -> dict:
	"""
	This function reads and deserialize the wikifier config file
	:param uid:
	:param pid:
	:param region_filename:
	:return:
	"""
	file_path = str(Path.cwd() / "config" / "uploads" / uid / pid / "wf" / region_filename)
	with open(file_path, 'r') as wikifier_region_config:
		wikifier_config = json.load(wikifier_region_config)
	return wikifier_config


def get_project_config_path(uid: str, pid: str) -> str:
	"""
	This function returns the path of the respective project config file
	:param uid:
	:param pid:
	:return:
	"""
	return str(Path.cwd() / "config" / "uploads" / uid / pid / "project_config.json")


def save_yaml_config(yaml_config_file_path: Union[str, Path], yaml_config) -> None:
	"""
	This function saves the YAMLFile object in a pickle file
	:param yaml_config_file_path:
	:param yaml_config: YAMLFile
	:return:
	"""
	with open(yaml_config_file_path, 'wb') as config_file:
		pickle.dump(yaml_config, config_file)


def load_yaml_config(yaml_config_file_path: Union[str, Path]):
	"""
	This function loads the pickle file and deserialize the contents into a YAMLFile object
	:param yaml_config_file_path:
	:return: YAMLFile
	"""
	with open(yaml_config_file_path, 'rb') as config_file:
		yaml_config = pickle.load(config_file)
	return yaml_config


def get_first_sheet_name(file_path: str):
	"""
	This function returns the first sheet name of the excel file
	:param file_path:
	:return:
	"""
	book_dict = pyexcel.get_book_dict(file_name=file_path)
	for sheet in book_dict.keys():
		return sheet


def query_wikidata_for_label_and_description(items: str, sparql_endpoint: str):
	query = """PREFIX wd: <http://www.wikidata.org/entity/>
			PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
			PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
			SELECT ?qnode (MIN(?label) AS ?label) (MIN(?desc) AS ?desc) WHERE { 
			  VALUES ?qnode {""" + items + """} 
			  ?qnode rdfs:label ?label; <http://schema.org/description> ?desc.
			  FILTER (langMatches(lang(?label),"EN"))
			  FILTER (langMatches(lang(?desc),"EN"))
			}
			GROUP BY ?qnode"""
	sparql = SPARQLWrapper(sparql_endpoint)
	sparql.setQuery(query)
	sparql.setReturnFormat(JSON)
	try:
		results = sparql.query().convert()
	except:
		return None
	response = dict()
	try:
		for i in range(len(results["results"]["bindings"])):
			qnode = results["results"]["bindings"][i]["qnode"]["value"].split("/")[-1]
			label = results["results"]["bindings"][i]["label"]["value"]
			desc = results["results"]["bindings"][i]["desc"]["value"]
			response[qnode] = {'label': label, 'desc': desc}
	except IndexError:
		pass
	return response


def save_wikified_result(serialized_row_data: List[dict], filepath: str):
	keys = ['context', 'col', 'row', 'value', 'item', 'label', 'desc']
	serialized_row_data.sort(key=lambda x: [x['context'], natural_sort_key(x['col']), natural_sort_key(x['row'])])
	with open(filepath, 'w', newline='') as output_file:
		dict_writer = csv.DictWriter(output_file, keys)
		dict_writer.writeheader()
		dict_writer.writerows(serialized_row_data)


def item_exists(item_table, col, row, context):
	if (col, row) in item_table.table and context in item_table.table[(col,row)]:
		return True
	return False


def get_cell_value(bindings, row, column):
	try:
		value = str(bindings['excel_sheet'][row, column]).strip()
	except IndexError:
		raise Exception("T2WMLException.ValueOutOfBound", T2WMLException.ValueOutOfBound.value, "Cell " + get_actual_cell_index((column, row)) + " is outside the bounds of the current data file")
	return value


def validate_yaml_parameters_based_on_property_type(object: dict, location_of_object_in_yaml_file: str, sparql_endpoint: str, is_checking_for_qualifier: bool):
	template_property = str(object['property'])
	errors = list()
	if template_property in property_type_map:
		property_type = property_type_map[template_property]
	else:
		property_type = get_property_type(template_property, sparql_endpoint)
		property_type_map[template_property] = property_type
	if property_type == 'Time':
		if is_checking_for_qualifier:
			valid_keys = {'property', 'value', 'calendar', 'precision', 'time_zone', 'format', 'unit'}
		else:
			valid_keys = {'property', 'value', 'calendar', 'precision', 'time_zone', 'format', 'item', 'qualifier', 'unit'}
		for key in object.keys():
			if key not in valid_keys:
				error = dict()
				error["errorCode"] = "T2WMLException.KeyErrorInYAMLFile"
				error["errorTitle"] = T2WMLException.KeyErrorInYAMLFile.value
				error["errorDescription"] = "Unrecognized key '" + key + "' (" + location_of_object_in_yaml_file + " -> " + key + ") found"
				errors.append(error)

		if 'calendar' not in object:
			error = dict()
			error["errorCode"] = "T2WMLException.KeyErrorInYAMLFile"
			error["errorTitle"] = T2WMLException.KeyErrorInYAMLFile.value
			error["errorDescription"] = "Key 'calendar' not found (" + location_of_object_in_yaml_file + " -> calendar)"
			errors.append(error)
		else:
			if not object['calendar'] or not isinstance(object['calendar'], str):
				error = dict()
				error["errorCode"] = "T2WMLException.ValueErrorInYAMLFile"
				error["errorTitle"] = T2WMLException.ValueErrorInYAMLFile.value
				error["errorDescription"] = "Value of  key 'calendar' (" + location_of_object_in_yaml_file + " -> calendar) must be a string"
				errors.append(error)

		if 'precision' not in object:
			error = dict()
			error["errorCode"] = "T2WMLException.KeyErrorInYAMLFile"
			error["errorTitle"] = T2WMLException.KeyErrorInYAMLFile.value
			error["errorDescription"] = "Key 'precision' not found (" + location_of_object_in_yaml_file + " -> precision)"
			errors.append(error)
		else:
			if not object['precision'] or not isinstance(object['precision'], (str, int)):
				error = dict()
				error["errorCode"] = "T2WMLException.ValueErrorInYAMLFile"
				error["errorTitle"] = T2WMLException.ValueErrorInYAMLFile.value
				error["errorDescription"] = "Value of  key 'precision' (" + location_of_object_in_yaml_file + " -> precision) must be a string or an integer"
				errors.append(error)

		if 'time_zone' not in object:
			error = dict()
			error["errorCode"] = "T2WMLException.KeyErrorInYAMLFile"
			error["errorTitle"] = T2WMLException.KeyErrorInYAMLFile.value
			error["errorDescription"] = "Key 'time_zone' not found (" + location_of_object_in_yaml_file + " -> time_zone)"
			errors.append(error)
		else:
			if object['time_zone'] is None or not str(object['time_zone']).isdigit() or not isinstance(object['format'], (str, int)):
				error = dict()
				error["errorCode"] = "T2WMLException.ValueErrorInYAMLFile"
				error["errorTitle"] = T2WMLException.ValueErrorInYAMLFile.value
				error["errorDescription"] = "Value of  key 'time_zone' (" + location_of_object_in_yaml_file + " -> time_zone) must be an integer"
				errors.append(error)

		if 'format' not in object:
			error = dict()
			error["errorCode"] = "T2WMLException.KeyErrorInYAMLFile"
			error["errorTitle"] = T2WMLException.KeyErrorInYAMLFile.value
			error["errorDescription"] = "Key 'format' not found (" + location_of_object_in_yaml_file + " -> format)"
			errors.append(error)
		else:
			if not object['format'] or not isinstance(object['format'], str):
				error = dict()
				error["errorCode"] = "T2WMLException.ValueErrorInYAMLFile"
				error["errorTitle"] = T2WMLException.ValueErrorInYAMLFile.value
				error["errorDescription"] = "Value of  key 'format' (" + location_of_object_in_yaml_file + " -> format) must be a string"
				errors.append(error)

	elif property_type == 'Monolingualtext':
		if is_checking_for_qualifier:
			valid_keys = {'property', 'value','lang', 'unit'}
		else:
			valid_keys = {'property', 'value', 'lang', 'item', 'qualifier', 'unit'}
		for key in object.keys():
			if key not in valid_keys:
				error = dict()
				error["errorCode"] = "T2WMLException.KeyErrorInYAMLFile"
				error["errorTitle"] = T2WMLException.KeyErrorInYAMLFile.value
				error["errorDescription"] = "Unrecognized key '" + key + "' (" + location_of_object_in_yaml_file + " -> " + key + ") found"
				errors.append(error)

		if 'lang' not in object:
			error = dict()
			error["errorCode"] = "T2WMLException.KeyErrorInYAMLFile"
			error["errorTitle"] = T2WMLException.KeyErrorInYAMLFile.value
			error["errorDescription"] = "Key 'lang' not found (" + location_of_object_in_yaml_file + " -> lang)"
			errors.append(error)
		else:
			if not object['lang'] or not isinstance(object['lang'], str):
				error = dict()
				error["errorCode"] = "T2WMLException.ValueErrorInYAMLFile"
				error["errorTitle"] = T2WMLException.ValueErrorInYAMLFile.value
				error["errorDescription"] = "Value of  key 'lang' (" + location_of_object_in_yaml_file + " -> format) must be a lang"
				errors.append(error)

	elif property_type == 'GlobeCoordinate':
		if is_checking_for_qualifier:
			valid_keys = {'property', 'value', 'latitude', 'longitude', 'precision', 'unit'}
		else:
			valid_keys = {'property', 'value', 'latitude', 'longitude', 'precision', 'item', 'qualifier', 'unit'}
		for key in object.keys():
			if key not in valid_keys:
				error = dict()
				error["errorCode"] = "T2WMLException.KeyErrorInYAMLFile"
				error["errorTitle"] = T2WMLException.KeyErrorInYAMLFile.value
				error["errorDescription"] = "Unrecognized key '" + key + "' (" + location_of_object_in_yaml_file + " -> " + key + ") found"
				errors.append(error)

		if 'latitude' not in object:
			error = dict()
			error["errorCode"] = "T2WMLException.KeyErrorInYAMLFile"
			error["errorTitle"] = T2WMLException.KeyErrorInYAMLFile.value
			error["errorDescription"] = "Key 'latitude' not found (" + location_of_object_in_yaml_file + " -> latitude)"
			errors.append(error)
		else:
			if not object['latitude'] or not isinstance(object['latitude'], (str, int)):
				error = dict()
				error["errorCode"] = "T2WMLException.ValueErrorInYAMLFile"
				error["errorTitle"] = T2WMLException.ValueErrorInYAMLFile.value
				error["errorDescription"] = "Value of  key 'latitude' (" + location_of_object_in_yaml_file + " -> latitude) must be a string or an integer"
				errors.append(error)

		if 'longitude' not in object:
			error = dict()
			error["errorCode"] = "T2WMLException.KeyErrorInYAMLFile"
			error["errorTitle"] = T2WMLException.KeyErrorInYAMLFile.value
			error["errorDescription"] = "Key 'longitude' not found (" + location_of_object_in_yaml_file + " -> longitude)"
			errors.append(error)
		else:
			if not object['longitude'] or not isinstance(object['longitude'], (str, int)):
				error = dict()
				error["errorCode"] = "T2WMLException.ValueErrorInYAMLFile"
				error["errorTitle"] = T2WMLException.ValueErrorInYAMLFile.value
				error["errorDescription"] = "Value of  key 'longitude' (" + location_of_object_in_yaml_file + " -> longitude) must be a string or an integer"
				errors.append(error)

		if 'precision' not in object:
			error = dict()
			error["errorCode"] = "T2WMLException.KeyErrorInYAMLFile"
			error["errorTitle"] = T2WMLException.KeyErrorInYAMLFile.value
			error["errorDescription"] = "Key 'precision' not found (" + location_of_object_in_yaml_file + " -> precision)"
			errors.append(error)
		else:
			if not object['precision'] or not isinstance(object['precision'], (str, int)):
				error = dict()
				error["errorCode"] = "T2WMLException.ValueErrorInYAMLFile"
				error["errorTitle"] = T2WMLException.ValueErrorInYAMLFile.value
				error["errorDescription"] = "Value of  key 'precision' (" + location_of_object_in_yaml_file + " -> precision) must be a string or an integer"
				errors.append(error)
	else:
		if is_checking_for_qualifier:
			valid_keys = {'property', 'value', 'unit'}
		else:
			valid_keys = {'property', 'value', 'item', 'qualifier', 'unit'}
		for key in object.keys():
			if key not in valid_keys:
				error = dict()
				error["errorCode"] = "T2WMLException.KeyErrorInYAMLFile"
				error["errorTitle"] = T2WMLException.KeyErrorInYAMLFile.value
				error["errorDescription"] = "Unrecognized key '" + key + "' (" + location_of_object_in_yaml_file + " -> " + key + ") found"
				errors.append(error)
	return errors


def validate_yaml(yaml_file_path, sparql_endpoint):
	with open(yaml_file_path, 'r') as stream:
		yaml_file_data = yaml.safe_load(stream)
		errors = list()
		for key in yaml_file_data.keys():
			if key != 'statementMapping':
				error = dict()
				error["errorCode"] = "T2WMLException.KeyErrorInYAMLFile"
				error["errorTitle"] = T2WMLException.KeyErrorInYAMLFile.value
				error["errorDescription"] = "Unrecognized key '" + key + "' found"
				errors.append(error)

		if 'statementMapping' in yaml_file_data:
			for key in yaml_file_data['statementMapping'].keys():
				if key not in {'region', 'template', 'created_by'}:
					error = dict()
					error["errorCode"] = "T2WMLException.KeyErrorInYAMLFile"
					error["errorTitle"] = T2WMLException.KeyErrorInYAMLFile.value
					error["errorDescription"] = "Unrecognized key '" + key + "' (statementMapping -> " + key + ") found"
					errors.append(error)

			if 'created_by' in yaml_file_data['statementMapping']:
				if not yaml_file_data['statementMapping']['created_by']:
					error = dict()
					error["errorCode"] = "T2WMLException.ValueErrorInYAMLFile"
					error["errorTitle"] = T2WMLException.ValueErrorInYAMLFile.value
					error["errorDescription"] = "Value of key 'created_by' (statementMapping -> created_by) cannot be empty"
					errors.append(error)

			if 'region' in yaml_file_data['statementMapping']:
				if yaml_file_data['statementMapping']['region']:
					if isinstance(yaml_file_data['statementMapping']['region'], list):
						for i in range(len(yaml_file_data['statementMapping']['region'])):
							for key in yaml_file_data['statementMapping']['region'][i].keys():
								if key not in {'left', 'right', 'top', 'bottom', 'skip_row', 'skip_column', 'skip_cell'}:
									error = dict()
									error["errorCode"] = "T2WMLException.KeyErrorInYAMLFile"
									error["errorTitle"] = T2WMLException.KeyErrorInYAMLFile.value
									error["errorDescription"] = "Unrecognized key '" + key + "' (statementMapping -> region[" + str(i) + "] -> " + key + ") found"
									errors.append(error)

							if 'left' not in yaml_file_data['statementMapping']['region'][i]:
								error = dict()
								error["errorCode"] = "T2WMLException.KeyErrorInYAMLFile"
								error["errorTitle"] = T2WMLException.KeyErrorInYAMLFile.value
								error["errorDescription"] = "Key 'left' (statementMapping -> region[" + str(i) + "] -> X) not found"
								errors.append(error)

							if 'right' not in yaml_file_data['statementMapping']['region'][i]:
								error = dict()
								error["errorCode"] = "T2WMLException.KeyErrorInYAMLFile"
								error["errorTitle"] = T2WMLException.KeyErrorInYAMLFile.value
								error["errorDescription"] = "Key 'right' not found (" \
															"statementMapping -> region[" + str(i) + "] -> X) "
								errors.append(error)

							if 'top' not in yaml_file_data['statementMapping']['region'][i]:
								error = dict()
								error["errorCode"] = "T2WMLException.KeyErrorInYAMLFile"
								error["errorTitle"] = T2WMLException.KeyErrorInYAMLFile.value
								error["errorDescription"] = "Key 'top' (statementMapping -> region[" + str(i) + "] -> X) not found"
								errors.append(error)

							if 'bottom' not in yaml_file_data['statementMapping']['region'][i]:
								error = dict()
								error["errorCode"] = "T2WMLException.KeyErrorInYAMLFile"
								error["errorTitle"] = T2WMLException.KeyErrorInYAMLFile.value
								error["errorDescription"] = "Key 'bottom' not found (" \
															"statementMapping -> region[" + str(i) + "] -> X) "
								errors.append(error)

							if 'skip_row' in yaml_file_data['statementMapping']['region'][i]:
								if not yaml_file_data['statementMapping']['region'][i]['skip_row'] or not isinstance(yaml_file_data['statementMapping']['region'][i]['skip_row'], list):
									error = dict()
									error["errorCode"] = "T2WMLException.ValueErrorInYAMLFile"
									error["errorTitle"] = T2WMLException.ValueErrorInYAMLFile.value
									error["errorDescription"] = "Value of key 'skip_row' (statementMapping -> region[" + str(i) + "] -> skip_row) is not appropriate. Value should be a list of T2WML expressions."
									errors.append(error)

							if 'skip_column' in yaml_file_data['statementMapping']['region'][i]:
								if not yaml_file_data['statementMapping']['region'][i]['skip_column'] or not isinstance(yaml_file_data['statementMapping']['region'][i]['skip_column'], list):
									error = dict()
									error["errorCode"] = "T2WMLException.ValueErrorInYAMLFile"
									error["errorTitle"] = T2WMLException.ValueErrorInYAMLFile.value
									error["errorDescription"] = "Value of key 'skip_column' (statementMapping -> region[" + str(i) + "] -> skip_column) is not appropriate. Value should be a list of T2WML expressions."
									errors.append(error)

							if 'skip_cell' in yaml_file_data['statementMapping']['region'][i]:
								if not yaml_file_data['statementMapping']['region'][i]['skip_cell'] or not isinstance(yaml_file_data['statementMapping']['region'][i]['skip_cell'], list):
									error = dict()
									error["errorCode"] = "T2WMLException.ValueErrorInYAMLFile"
									error["errorTitle"] = T2WMLException.ValueErrorInYAMLFile.value
									error["errorDescription"] = "Value of key 'skip_cell' (statementMapping -> region[" + str(i) + "] -> skip_cell) is not appropriate. Value should be a list of T2WML expressions."
									errors.append(error)
					else:
						error = dict()
						error["errorCode"] = "T2WMLException.ValueErrorInYAMLFile"
						error["errorTitle"] = T2WMLException.ValueErrorInYAMLFile.value
						error["errorDescription"] = "Value of  key 'region' (statementMapping -> region) must be a list"
						errors.append(error)
				else:
					error = dict()
					error["errorCode"] = "T2WMLException.ValueErrorInYAMLFile"
					error["errorTitle"] = T2WMLException.ValueErrorInYAMLFile.value
					error["errorDescription"] = "Value of key 'region' (statementMapping -> region) cannot be empty"
					errors.append(error)
			else:
				error = dict()
				error["errorCode"] = "T2WMLException.KeyErrorInYAMLFile"
				error["errorTitle"] = T2WMLException.KeyErrorInYAMLFile.value
				error["errorDescription"] = "Key 'region' (statementMapping -> X) not found"
				errors.append(error)

			if 'template' in yaml_file_data['statementMapping']:
				if isinstance(yaml_file_data['statementMapping']['template'], dict):
					for key in yaml_file_data['statementMapping']['template'].keys():
						if key not in {'item', 'property', 'value', 'qualifier', 'calendar', 'precision', 'time_zone', 'format', 'lang', 'longitude', 'latitude', 'unit'}:
							error = dict()
							error["errorCode"] = "T2WMLException.KeyErrorInYAMLFile"
							error["errorTitle"] = T2WMLException.KeyErrorInYAMLFile.value
							error["errorDescription"] = "Unrecognized key '" + key + "' (statementMapping -> template -> " + key + ") found"
							errors.append(error)

					if 'item' not in yaml_file_data['statementMapping']['template']:
						error = dict()
						error["errorCode"] = "T2WMLException.KeyErrorInYAMLFile"
						error["errorTitle"] = T2WMLException.KeyErrorInYAMLFile.value
						error["errorDescription"] = "Key 'item' (statementMapping -> template -> X) not found"
						errors.append(error)

					if 'property' not in yaml_file_data['statementMapping']['template']:
						error = dict()
						error["errorCode"] = "T2WMLException.KeyErrorInYAMLFile"
						error["errorTitle"] = T2WMLException.KeyErrorInYAMLFile.value
						error["errorDescription"] = "Key 'property' (statementMapping -> template -> X) not found"
						errors.append(error)

					if 'value' not in yaml_file_data['statementMapping']['template']:
						error = dict()
						error["errorCode"] = "T2WMLException.KeyErrorInYAMLFile"
						error["errorTitle"] = T2WMLException.KeyErrorInYAMLFile.value
						error["errorDescription"] = "Key 'value' (statementMapping -> template -> X) not found"
						errors.append(error)

					if 'qualifier' in yaml_file_data['statementMapping']['template']:
						if yaml_file_data['statementMapping']['template']['qualifier']:
							if isinstance(yaml_file_data['statementMapping']['template']['qualifier'], list):
								qualifiers = yaml_file_data['statementMapping']['template']['qualifier']
								for i in range(len(qualifiers)):
									object = qualifiers[i]
									if object and isinstance(object, dict):
										for key in object.keys():
											if key not in {'property', 'value', 'qualifier', 'calendar',
														   'precision', 'time_zone', 'format', 'lang', 'longitude',
														   'latitude', 'unit'}:
												error = dict()
												error["errorCode"] = "T2WMLException.KeyErrorInYAMLFile"
												error["errorTitle"] = T2WMLException.KeyErrorInYAMLFile.value
												error["errorDescription"] = "Unrecognized key '" + key + "' (statementMapping -> template -> qualifier[" + str(i) + "] -> " + key + ") found"
												errors.append(error)
									else:
										error = dict()
										error["errorCode"] = "T2WMLException.ValueErrorInYAMLFile"
										error["errorTitle"] = T2WMLException.ValueErrorInYAMLFile.value
										error["errorDescription"] = "Value of  key 'qualifier[" + str(i) + "]' (statementMapping -> template -> qualifier[" + str(i) + "]) must be a dictionary"
										errors.append(error)
							else:
								error = dict()
								error["errorCode"] = "T2WMLException.ValueErrorInYAMLFile"
								error["errorTitle"] = T2WMLException.ValueErrorInYAMLFile.value
								error["errorDescription"] = "Value of  key 'qualifier' (statementMapping -> template -> qualifier) must be a list"
								errors.append(error)
						else:
							error = dict()
							error["errorCode"] = "T2WMLException.ValueErrorInYAMLFile"
							error["errorTitle"] = T2WMLException.ValueErrorInYAMLFile.value
							error["errorDescription"] = "Value of key 'qualifier' (statementMapping -> template -> qualifier) cannot be empty"
							errors.append(error)
				else:
					error = dict()
					error["errorCode"] = "T2WMLException.ValueErrorInYAMLFile"
					error["errorTitle"] = T2WMLException.ValueErrorInYAMLFile.value
					error["errorDescription"] = "Value of  key 'template' (statementMapping -> template) must be a dictionary"
					errors.append(error)
			else:
				error = dict()
				error["errorCode"] = "T2WMLException.KeyErrorInYAMLFile"
				error["errorTitle"] = T2WMLException.KeyErrorInYAMLFile.value
				error["errorDescription"] = "Key 'template' (statementMapping -> X) not found"
				errors.append(error)
		else:
			error = dict()
			error["errorCode"] = "T2WMLException.KeyErrorInYAMLFile"
			error["errorTitle"] = T2WMLException.KeyErrorInYAMLFile.value
			error["errorDescription"] = "Key 'statementMapping' not found"
			errors.append(error)
		return errors


# def json_validator():
	# if is_left_valid and is_right_valid:
	# 	left_value = str(yaml_file_data['statementMapping']['region'][i]['left'])
	# 	right_value = str(yaml_file_data['statementMapping']['region'][i]['right'])
	# 	values = sorted([left_value, right_value], key=natural_sort_key)
	# 	if values != [left_value, right_value]:
	# 		error = dict()
	# 		error["errorCode"] = "T2WMLException.ValueErrorInYAMLFile"
	# 		error["errorTitle"] = T2WMLException.ValueErrorInYAMLFile.value
	# 		error["errorDescription"] = "Value of keys 'left' and 'right' (statementMapping -> region[" + str(
	# 			i) + "] -> left/right) are not appropriate. They should satisfy the condition left <= right "
	# 		errors.append(error)
	#
	# if is_top_valid and is_bottom_valid:
	# 	top_value = str(yaml_file_data['statementMapping']['region'][i]['top'])
	# 	bottom_value = str(yaml_file_data['statementMapping']['region'][i]['bottom'])
	# 	values = sorted([top_value, bottom_value], key=natural_sort_key)
	# 	if values != [top_value, bottom_value]:
	# 		error = dict()
	# 		error["errorCode"] = "T2WMLException.ValueErrorInYAMLFile"
	# 		error["errorTitle"] = T2WMLException.ValueErrorInYAMLFile.value
	# 		error["errorDescription"] = "Value of keys 'top' and 'bottom' (statementMapping -> region[" + str(
	# 			i) + "] -> top/bottom) are not appropriate. They should satisfy the condition top <= bottom "
	# 		errors.append(error)

