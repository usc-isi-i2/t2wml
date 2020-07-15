import json
import requests
import tempfile
import pandas as pd
import numpy as np
from t2wml.utils import t2wml_exceptions as T2WMLExceptions
from t2wml.spreadsheets.conversions import to_excel,  cell_range_str_to_tuples
from t2wml.spreadsheets.sheet import Sheet

def service_wikifier(cell_range: str, data_file_path: str, sheet_name: str, context) -> dict:
    """
    This function processes the calls to the wikifier service
    :param cell_range: (called region in UI)
    :param excel_file_path:
    :param sheet_name:
    :return:
    """
    df, problem_cells = wikify(cell_range, data_file_path, sheet_name)
    if not context:
        context = ''
    df['context'] = context
    return df, problem_cells


def wikify(cell_range, data_file_path, sheet_name):
    (start_col, start_row), (end_col, end_row) = cell_range_str_to_tuples(cell_range)
    end_col+=1
    end_row+=1

    row_offset=start_row
    columns=",".join([str(i) for i in range(start_col, end_col)])
    #rows=",".join([str(i) for i in range(start_row, end_row)])
    cell_qnode_map = dict()
    payload = {
        'columns': columns,
    #    'rows':rows,
        'case_sensitive': 'false'
    }

    sheet=Sheet(data_file_path, sheet_name)
    sheet_data=sheet[start_row:end_row]
    flattened_sheet_data=sheet[start_row:end_row, start_col:end_col].to_numpy().flatten()

    data=call_wikify_service(sheet_data, payload)

    data = [x.split(",") for x in data]
    output = pd.DataFrame(data, columns=["column", "row", "item"])
    output = output.replace(r'^\s*$', np.nan, regex=True)
    empty_vals = np.where(pd.isnull(output)) #returns an array for row indices and col indices. 
    #the col indices are all 2 (because that's where the returned value would be and is null)
    #the row indices are which queries had the problem, that's what we pass to the problem reporting function
    if len(empty_vals[0]):
        problems=get_problem_cells(empty_vals[0], data, row_offset)
        #raise T2WMLExceptions.WikificationFailureException("Failed to wikify: "+ str(problems))
    else:
        problems=[]
    output.row=output.row.astype('int32')
    output.row=output.row+row_offset
    output.column=output.column.astype('int32')
    output['value']=flattened_sheet_data
    if len(empty_vals[0]):
        output=output.drop(empty_vals[0])

    return output, problems


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


def get_problem_cells(empty_vals, data, row_offset):
    '''
    empty_vals: indixes for which data arrays don't have a item
    data: list of arrays, [col, row, item]
    '''
    problems=[]
    for problem_index in empty_vals:
        col=int(data[problem_index][0])
        row=int(data[problem_index][1])+row_offset
        problem_cell=to_excel(col, row)
        problems.append(problem_cell)
    return problems