import os
import pickle
import uuid
from pathlib import Path

from t2wml_api.utils import t2wml_exceptions as T2WMLExceptions
from t2wml_api.spreadsheets.conversions import _column_index_to_letter, _cell_range_str_to_tuples
from t2wml_api.spreadsheets.sheet import Sheet
from t2wml_api.spreadsheets.caching import PandasLoader


def create_temporary_csv_file(cell_range: str, data_file_path: str, sheet_name: str = None) -> str:
    """
    This function creates a temporary csv file of the region which has to be sent to the wikifier service for wikification
    :param cell_range:
    :param excel_file_path:
    :param sheet_name:
    :return:
    """
    file_name = uuid.uuid4().hex + ".csv"
    csv_file_path = str(Path.cwd() / "temporary_files" / file_name)
    if not os.path.exists(str(Path.cwd() / "temporary_files")):
        os.mkdir(str(Path.cwd() / "temporary_files"))
    (start_col, start_row), (end_col, end_row) = _cell_range_str_to_tuples(cell_range)
    end_col+=1
    end_row+=1
    try:
        sheet=Sheet(data_file_path, sheet_name)
        data=sheet[start_row:end_row, start_col:end_col]
        data.to_csv(csv_file_path, header=False, index=False)
    except IOError:
        raise IOError('Excel File cannot be found or opened')
    return csv_file_path, ((start_col, start_row), (end_col, end_row))


def get_first_sheet_name(file_path: str):
    """
    This function returns the first sheet name of the excel file
    :param file_path:
    :return:
    """
    pw=PandasLoader(file_path)
    return pw.get_sheet_names()[0]


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
