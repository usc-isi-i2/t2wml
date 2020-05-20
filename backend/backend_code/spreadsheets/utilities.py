#isolating all spreadsheet management code here

import pandas
import pickle
import pyexcel
import uuid
from pathlib import Path


from backend_code import t2wml_exceptions as T2WMLExceptions
from backend_code.spreadsheets.conversions import _column_index_to_letter
from backend_code.spreadsheets.sheet import Sheet




def get_first_sheet_name(file_path: str):
    """
    This function returns the first sheet name of the excel file
    :param file_path:
    :return:
    """
    book_dict = pyexcel.get_book_dict(file_name=file_path)
    for sheet in book_dict.keys():
        return sheet

def excel_to_json(file_path: str, sheet_name: str = None) -> dict:
    """
    This function reads the excel file and converts it to JSON
    :param file_path:
    :param sheet_name:
    :param want_sheet_names:
    :return:
    """
    sheet_data = {'columnDefs': [{'headerName': "", 'field': "^", 'pinned': "left"}], 
                 'rowData': []}
    sheet=Sheet(file_path, sheet_name)
    for i in range(len(sheet[0])):
        column_def = _column_index_to_letter(i)
        sheet_data['columnDefs'].append({'headerName': column_def, 'field': column_def})
    initial_json=sheet.to_json()
    initial_json=initial_json['data']
    for i, row in enumerate(initial_json):
        row["^"]=str(i+1)
    sheet_data['rowData']=initial_json
    return sheet_data
