import pandas as pd
import json
from backend_code.spreadsheets.caching import FileSystemPickleCacher, FakeCacher, cache_settings
from backend_code.spreadsheets.conversions import to_excel, _column_index_to_letter
import backend_code.t2wml_exceptions as T2WMLExceptions

def get_cache_class():
    cache_class = FakeCacher
    if cache_settings["use_cache"]:
        cache_class = FileSystemPickleCacher
    return cache_class


class Sheet:
    #a class to wrap ALL sheet interactions, so that all access to spreadsheet goes through here
    def __init__(self, data_file_path, sheet_name):
        cache_class=get_cache_class()
        sc=cache_class(data_file_path, sheet_name)
        self.sheet_name=sheet_name
        self.data=sc.get_sheet()
    
    def __getitem__(self, params):
        try:
            return self.data.iloc[params]
        except IndexError:
            raise T2WMLExceptions.ValueOutOfBoundException("Cell " + to_excel(params[1], params[0]) + " is outside the bounds of the current data file")


    def __len__(self):
        return len(self.data)
            
    def to_json(self):
        #rename cols
        col_names=[]
        for i in range(len(self.data.iloc[0])):
            column = _column_index_to_letter(i)
            col_names.append(column)
        data=self.data.copy()
        data.columns=col_names
        #rename rows
        data.index+=1
        #get json
        json_string=data.to_json(orient='table')
        return_dict=json.loads(json_string)
        return return_dict
    

def save_and_get_sheet_names(data_file_path):
    cache_class=get_cache_class()
    sheet_names= cache_class.save_file(data_file_path)
    return sheet_names