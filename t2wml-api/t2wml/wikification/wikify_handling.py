import json
import requests
import tempfile
import pandas as pd
import numpy as np
from t2wml.utils import t2wml_exceptions as T2WMLExceptions
from t2wml.spreadsheets.conversions import to_excel,  cell_range_str_to_tuples
from t2wml.spreadsheets.sheet import Sheet

def wikifier(cell_range: str, data_file_path: str, sheet_name: str, context) -> dict:
    """
    This function processes the calls to the wikifier service
    :param item_table:
    :param cell_range: (called region in UI)
    :param excel_file_path:
    :param sheet_name:
    :return:
    """

    df = wikify(cell_range, data_file_path, sheet_name)
    if not context:
        context = '__NO_CONTEXT__'
    df['context'] = context
    return df


def wikify(cell_range, data_file_path, sheet_name):
    (start_col, start_row), (end_col, end_row) = cell_range_str_to_tuples(cell_range)
    end_col+=1
    end_row+=1

    row_offset=start_row
    columns=",".join([str(i) for i in range(start_col, end_col)])
    cell_qnode_map = dict()
    payload = {
        'columns': columns,
        'case_sensitive': 'false'
    }

    sheet=Sheet(data_file_path, sheet_name)
    data=sheet[start_row:end_row, start_col:end_col]

    data=call_wikify_service(data, payload)

    data = [x.split(",") for x in data]
    output = pd.DataFrame(data, columns=["column", "row", "item"])
    output = output.replace(r'^\s*$', np.nan, regex=True)
    empty_vals = np.where(pd.isnull(output))
    if len(empty_vals[0]):
        problems=get_problem_cells(empty_vals, data, row_offset)
        raise T2WMLExceptions.WikificationFailureException("Failed to wikify: "+ str(problems))
    for index in range(output.shape[0]):
        output.at[index, 'column'] = int(output.at[index, 'column'])
        output.at[index, 'row'] = int(output.at[index, 'row']) + row_offset
    return output


def get_problem_cells(empty_vals, data, row_offset):
    problems=[]
    for problem_index in empty_vals[0]:
        col=int(data[problem_index][0])
        row=int(data[problem_index][1])+row_offset
        problem_cell=to_excel(col, row)
        problems.append(problem_cell)
    return problems


def call_wikify_service(sheet_data, payload):
    with tempfile.TemporaryFile(mode='r+', newline="") as fp:
        sheet_data.to_csv(fp, header=False, index=False)
        fp.seek(0)
        files = {
            'file': ('', fp),
            'format': (None, 'ISWC'),
            'type': (None, 'text/csv'),
            'header': (None, 'False')
        }
        response = requests.post('https://dsbox02.isi.edu:8888/wikifier/wikify', data=payload, files=files)
        if response.status_code == 200:
            data = response.content.decode("utf-8")
            data = json.loads(data)['data']
            return data
        else:
            raise requests.HTTPError("Failed to wikify: Received an error from the wikifier endpoint")


