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
    sheet_data = {'columnDefs': [{'headerName': "", 'field': "^", 'pinned': "left"}], 'rowData': []}
    column_index_map = {}
    if not sheet_name:
        sheet_name=get_first_sheet_name(file_path)
    sheet=Sheet(file_path, sheet_name)
    #book = pyexcel.get_book(file_name=file_path)
    #sheet = book[sheet_name]
    for i in range(len(sheet[0])):
        column = _column_index_to_letter(i)
        column_index_map[i + 1] = column
        sheet_data['columnDefs'].append({'headerName': column_index_map[i + 1], 'field': column_index_map[i + 1]})
    for row in range(len(sheet)):
        r = {'^': str(row + 1)}
        for col in range(len(sheet[row])):
            sheet[row][col] = str(sheet[row][col]).strip()
            r[column_index_map[col + 1]] = sheet[row][col]
        sheet_data['rowData'].append(r)

    return sheet_data