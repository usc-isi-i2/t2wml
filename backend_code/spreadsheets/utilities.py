#isolating all spreadsheet management code here

import pandas
import pickle
import pyexcel
import uuid
from pathlib import Path

from backend_code.bindings import bindings
from backend_code import t2wml_exceptions as T2WMLExceptions
from backend_code.spreadsheets.conversions import _column_index_to_letter
from backend_code.spreadsheets.sheet import Sheet


def add_blank_row_to_bindings():
    last_row=bindings.excel_sheet[-1]
    num_cols=len(last_row)
    blank_row = [" "] * num_cols
    if last_row!=blank_row:
        bindings.excel_sheet.append(blank_row)


def add_excel_file_to_bindings(excel_filepath: str, sheet_name: str) -> None:
    """
    This function reads the excel file and add the pyexcel object to the bindings
    :return: None
    """
    try:
        bindings.excel_sheet=Sheet(excel_filepath, sheet_name)
        add_blank_row_to_bindings()
    except IOError:
        raise IOError('Excel File cannot be found or opened')

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
    #add_row_in_data_file(file_path, sheet_name)
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