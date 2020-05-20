import pandas as pd
import json
from backend_code.spreadsheets.caching import PyexcelFileSystemPickle, PandasFileSystemPickle, FakeCacher, cache_settings
from backend_code.spreadsheets.conversions import to_excel
import backend_code.t2wml_exceptions as T2WMLExceptions

cache_class = FakeCacher


class Sheet:
    #a class to wrap ALL sheet interactions, so that all access to spreadsheet goes through here
    def __init__(self, data_filepath, sheet_name):
        if cache_settings["use_cache"]:
            cache_class = PyexcelFileSystemPickle
        sc=cache_class(data_filepath, sheet_name)
        self.sheet_name=sheet_name
        self.data=sc.get_sheet()
        #self.add_empty_row()
    
    def add_empty_row(self):
        #pretty defunct at this point, will probably get rid of soon
        empty_row= [""]*len(self.data[0])
        self.data.append(empty_row)
    
    def __getitem__(self, params):
        try:
            return self.data[params]
        except IndexError:
            raise T2WMLExceptions.ValueOutOfBoundException("Cell " + to_excel(params[1], params[0]) + " is outside the bounds of the current data file")

    def __len__(self):
        return len(self.data)
            
    def to_json(self):
        #rename cols
        col_names=[]
        for i in range(len(self.data[0])):
            column = _column_index_to_letter(i)
            col_names.append(column)
        self.data.columns=col_names
        #rename rows
        sheet.data.index+=1
        #get json
        json_string=self.data.to_json(orient='table')
        return_dict=json.loads(json_string)
        return return_dict


def save_and_get_sheet_names(data_filepath):
    sheet_names= cache_class.save_file(data_filepath)
    return sheet_names