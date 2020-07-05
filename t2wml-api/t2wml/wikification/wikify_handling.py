import re
import json
from pathlib import Path
import requests
from typing import List
import pandas as pd
import numpy as np
import uuid
from t2wml.wikification.item_table import ItemTable
from t2wml.utils import t2wml_exceptions as T2WMLExceptions
from t2wml.spreadsheets.utilities import create_temporary_csv_file
from t2wml.spreadsheets.conversions import to_excel

def wikifier(region: str, excel_file_path: str, sheet_name: str, context) -> dict:
    """
    This function processes the calls to the wikifier service and adds the output to the ItemTable object
    :param item_table:
    :param region:
    :param excel_file_path:
    :param sheet_name:
    :return:
    """

    df = wikify_region(region, excel_file_path, sheet_name)
    if not context:
        context = '__NO_CONTEXT__'
    df['context'] = context
    return df

def wikify_region(cell_range: str, excel_file_path: str, sheet_name: str = None):
    """
    This function parses the cell range, creates the temporary csv file and calls the wikifier service on that csv
    to get the cell qnode map. cell qnode map is then processed to omit non empty cells and is then returned.
    :param region:
    :param excel_file_path:
    :param sheet_name:
    :return:
    """
    file_path, cell_range = create_temporary_csv_file(cell_range, excel_file_path, sheet_name)
    cell_qnode_map = call_wikify_service(file_path, cell_range)
    return cell_qnode_map

def call_wikify_service(csv_file_path: str, cell_range):
    """
    This function calls the wikifier service and creates a cell to qnode dictionary based on the response
    cell to qnode dictionary = { 'A4': 'Q383', 'B5': 'Q6892' }
    :param csv_file_path:
    :param col_offset:
    :param row_offset:
    :return:
    """
    (start_col, start_row), (end_col, end_row) = cell_range
    row_offset=start_row
    columns=",".join([str(i) for i in range(start_col, end_col)])
    cell_qnode_map = dict()
    payload = {
        'columns': columns,
        'case_sensitive': 'false'
    }
    with open(csv_file_path, 'r') as f:
        files = {
            'file': ('', f),
            'format': (None, 'ISWC'),
            'type': (None, 'text/csv'),
            'header': (None, 'False')
        }
        response = requests.post('https://dsbox02.isi.edu:8888/wikifier/wikify', data=payload, files=files)

    if response.status_code == 200:
        data = response.content.decode("utf-8")
        data = json.loads(data)['data']
        data = [x.split(",") for x in data]

        output = pd.DataFrame(data, columns=["column", "row", "item"])
        output = output.replace(r'^\s*$', np.nan, regex=True)
        empty_vals = np.where(pd.isnull(output))
        if len(empty_vals[0]):
            problems=[]
            for problem_index in empty_vals[0]:
                col=int(data[problem_index][0])
                row=int(data[problem_index][1])+row_offset
                problem_cell=to_excel(col, row)
                problems.append(problem_cell)
            raise T2WMLExceptions.WikificationFailureException("Failed to wikify: "+ str(problems))
        for index in range(output.shape[0]):
            output.at[index, 'column'] = int(output.at[index, 'column'])
            output.at[index, 'row'] = int(output.at[index, 'row']) + row_offset
        return output
    else:
        raise requests.HTTPError("Failed to wikify: Received an error from the wikifier endpoint")


