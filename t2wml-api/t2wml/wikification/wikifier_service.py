import json
import requests
import tempfile
import pandas as pd
import numpy as np
from t2wml.spreadsheets.conversions import to_excel,  cell_range_str_to_tuples

class WikifierService:
    def __init__(self, wikifier_endpoint='https://dsbox02.isi.edu:8888/wikifier/wikify'):
        """
        Args:
            wikifier_endpoint (str, optional): endpoint for wikification. Defaults to 'https://dsbox02.isi.edu:8888/wikifier/wikify'.
        """
        self.wikifier_endpoint = wikifier_endpoint

    def wikify_region(self, cell_range: str, sheet, context:str=None):
        """given a cell range and a sheet, wikify the cells of that cell range

        Args:
            cell_range (str): range string in format cell:cell (eg A2:D4)
            sheet (Sheet): sheet class instance to be wikified
            context (str, optional): add a context to the wikification results. Defaults to None.

        Returns:
            DataFrame: wikifier dataframe with columns 'row', 'column', 'value', 'context', 'item'
            dict: dictionary of cells that failed to wikify
        """
        (start_col, start_row), (end_col,
                                 end_row) = cell_range_str_to_tuples(cell_range)
        end_col += 1
        end_row += 1

        row_offset = start_row
        columns = ",".join([str(i) for i in range(start_col, end_col)])
        #rows=",".join([str(i) for i in range(start_row, end_row)])
        cell_qnode_map = dict()
        payload = {
            'columns': columns,
            #    'rows':rows,
            'case_sensitive': 'false'
        }

        sheet_data = sheet[start_row:end_row]
        flattened_sheet_data = sheet[start_row:end_row,
                                     start_col:end_col].to_numpy().flatten()

        data = self._call_wikify_service(sheet_data, payload)

        data = [x.split(",") for x in data]
        output = pd.DataFrame(data, columns=["column", "row", "item"])
        output = output.replace(r'^\s*$', np.nan, regex=True)

        empty_vals, problems = self._get_errors(output, data, row_offset)

        output = self._normalize_dataframe(
            output, row_offset, context, flattened_sheet_data, empty_vals)

        return output, problems

    def _call_wikify_service(self, sheet_data, payload):
        with tempfile.TemporaryFile(mode='r+', newline="") as fp:
            sheet_data.to_csv(fp, header=False, index=False)
            fp.seek(0)
            files = {
                'file': ('', fp),
                'format': (None, 'ISWC'),
                'type': (None, 'text/csv'),
                'header': (None, 'False')
            }
            response = requests.post(
                self.wikifier_endpoint, data=payload, files=files)
        if response.status_code == 200:
            data = response.content.decode("utf-8")
            data = json.loads(data)['data']
            return data
        else:
            raise requests.HTTPError(
                "Failed to wikify: Received an error from the wikifier endpoint")

    def _normalize_dataframe(self, output, row_offset, context, flattened_sheet_data, empty_vals):
        output.row = output.row.astype('int32')
        output.row = output.row+row_offset
        output.column = output.column.astype('int32')
        output['value'] = flattened_sheet_data
        if not context:
            context = ''
        output['context'] = context
        if len(empty_vals):
            output = output.drop(empty_vals)
        return output

    def _get_errors(self, output, data, row_offset):
        # returns an array for row indices and col indices.
        empty_vals = np.where(pd.isnull(output))[0]
        # the col indices are all 2 (because that's where the returned value would be and is null)
        # the row indices are which queries had the problem, that's what we pass to the problem reporting function
        problems = []
        for problem_index in empty_vals:
            col = int(data[problem_index][0])
            row = int(data[problem_index][1])+row_offset
            problem_cell = to_excel(col, row)
            problems.append(problem_cell)
        return empty_vals, problems
