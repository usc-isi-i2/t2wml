import pandas as pd
import json
from backend_code.spreadsheets.caching import PyexcelFileSystemPickle, PandasFileSystemPickle
from backend_code.spreadsheets.conversions import to_excel
import backend_code.t2wml_exceptions as T2WMLExceptions


cache_class=PyexcelFileSystemPickle

class Sheet:
    #a class to wrap ALL sheet interactions, so that all access to spreadsheet goes through here
    def __init__(self, data_filepath, sheet_name):
        sc=cache_class(data_filepath, sheet_name)
        self.sheet_name=sheet_name
        self.data=sc.get_sheet()
        #self.add_empty_row()
    
    def add_empty_row(self):
        empty_row= [""]*len(self.data[0])
        self.append(empty_row)
    
    def __getitem__(self, params):
        try:
            return self.data[params]
        except IndexError:
            raise T2WMLExceptions.ValueOutOfBoundException("Cell " + to_excel(params[1], params[0]) + " is outside the bounds of the current data file")

    def __len__(self):
        return len(self.data)

    def append(self, row):
        self.data.append(row)
    
    def to_json(self):
        #rename cols
        #rename rows
        json_string=self.data.to_json(orient='table')
        return_dict=json.loads(json_string)
        return return_dict


def save_and_get_sheet_names(data_filepath):
    sheet_names= cache_class.save_file(data_filepath)
    return sheet_names