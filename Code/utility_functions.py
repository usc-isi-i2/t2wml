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


def add_row_in_data_file(file_path: str, sheet_name: str):
    """
    This function adds a new blank row at the end of the excel file
    :param file_path:
    :param sheet_name:
    :return:
    """
    book = pyexcel.get_book(file_name=file_path)
    num_of_cols = len(book[sheet_name][0])
    blank_row = [" "] * num_of_cols
    if book[sheet_name].row[-1] != blank_row:
        book[sheet_name].row += blank_row
    book.save_as(file_path)


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
    sheet = pyexcel.get_sheet(sheet_name=sheet_name, file_name=file_path)
    for i in range(len(sheet[0])):
        column = get_column_letter(i + 1)
        column_index_map[i + 1] = column
        sheet_data['columnDefs'].append({'headerName': column_index_map[i + 1], 'field': column_index_map[i + 1]})
    for row in range(len(sheet)):
        r = {'^': str(row + 1)}
        for col in range(len(sheet[row])):
            r[column_index_map[col + 1]] = str(sheet[row][col]).strip()
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
    if text is None or str(text).strip() == "" or check_special_characters(text) or str(text).strip().lower() == '#n/a' or str(text).strip().lower() == 'none':
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


def verify_google_login(tn: str) -> Tuple[dict, int]:
    """
    This function verifies the oauth token by sending a request to Google's server.
    :param tn:
    :return:
    """
    error = None
    try:
        client_id = GOOGLE_CLIENT_ID
        request = requests.Request()
        user_info = id_token.verify_oauth2_token(tn, request, client_id)

        if user_info['iss'] not in ['accounts.google.com', 'https://accounts.google.com']:
            error = 'Wrong issuer'
            user_info = None

    except ValueError as e:
        user_info = None
        error = str(e)

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


def get_project_details(user_dir: Path) -> List[Dict[str, Any]]:
    """
    This function iterates all the project directories in the user_directory and fetches the project details from the project_config.json
    :param user_dir:
    :return:
    """
    projects = list()
    for project_dir in user_dir.iterdir():
        if project_dir.is_dir():
            with open(project_dir / "project_config.json", "r") as file:
                project_config = json.load(file)
                project_detail = dict()
                project_detail["pid"] = project_config["pid"]
                project_detail["ptitle"] = project_config["ptitle"]
                project_detail["cdate"] = project_config["cdate"]
                project_detail["mdate"] = project_config["mdate"]
                projects.append(project_detail)
    return projects


def get_region_mapping(uid: str, pid: str, project, data_file_name=None, sheet_name=None) -> Tuple[dict, int]:
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


def update_wikifier_region_file(uid: str, pid: str, region_filename: str, region_qnodes: dict) -> None:
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
            json.dump(region_qnodes, wikifier_region_config, indent=3)

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
