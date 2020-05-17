import re
import json
from pathlib import Path
import requests
import csv
from typing import List
from backend_code.item_table import ItemTable
from backend_code import t2wml_exceptions as T2WMLExceptions
from backend_code.spreadsheets.conversions import _cell_range_str_to_tuples
import pandas as pd
import uuid
import pyexcel

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
    cell_range = _cell_range_str_to_tuples(region)
    file_path = create_temporary_csv_file(cell_range, excel_filepath, sheet_name)
    cell_qnode_map = call_wikifiy_service(file_path, cell_range[0][0], cell_range[0][1])
    return cell_qnode_map


def csv_to_dataframe(file_path):
    df = pd.read_csv(file_path)
    return df


def process_wikified_output_file(file_path: str, item_table: ItemTable, data_filepath, sheet_name, context=None):
    df = csv_to_dataframe(file_path)
    item_table.update_table(df, data_filepath, sheet_name)

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
        sheet = pyexcel.get_sheet(sheet_name=sheet_name, file_name=excel_filepath, 
                                  start_row=cell_range[0][1],
                                  row_limit=cell_range[1][1] - cell_range[0][1] + 1, 
                                  start_column=cell_range[0][0],
                                  column_limit=cell_range[1][0] - cell_range[0][0] + 1)
        pyexcel.save_as(array=sheet, dest_file_name=file_path)
    except IOError:
        raise IOError('Excel File cannot be found or opened')
    return file_path

def save_wikified_result(serialized_row_data: List[dict], filepath: str):
    def natural_sort_key(s: str) -> list:
        """
        This function generates the key for the natural sorting algorithm
        :param s:
        :return:
        """
        _nsre = re.compile('([0-9]+)')
        return [int(text) if text.isdigit() else text.lower() for text in re.split(_nsre, s)]


    keys = ['context', 'col', 'row', 'value', 'item', 'label', 'desc']
    serialized_row_data.sort(key=lambda x: [x['context'], natural_sort_key(x['col']), natural_sort_key(x['row'])])
    with open(filepath, 'w', newline='', encoding="utf-8") as output_file:
        dict_writer = csv.DictWriter(output_file, keys)
        dict_writer.writeheader()
        dict_writer.writerows(serialized_row_data)