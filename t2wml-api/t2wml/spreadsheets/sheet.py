import pandas as pd
import json
from pathlib import Path
from t2wml.settings import t2wml_settings
from t2wml.spreadsheets.utilities import PandasLoader
from t2wml.spreadsheets.caching import PickleCacher, FakeCacher
from t2wml.spreadsheets.conversions import to_excel
import t2wml.utils.t2wml_exceptions as T2WMLExceptions

def get_cache_class():
    cache_class = FakeCacher
    if t2wml_settings["cache_data_files"]:
        cache_class = PickleCacher
    return cache_class

class SpreadsheetFile:
    def __init__(self, file_path):
        self.file_path=file_path
        self.pandas_loader=PandasLoader(file_path)
        self.sheet_names=self.pandas_loader.get_sheet_names()
        self.use_cache=use_cache
        if t2wml_settings["cache_data_files"]:
            self.init_cache()
    
    def init_cache(self):
        sheet_data=self.pandas_loader.load_file()
        for sheet_name in sheet_data:
            pc=PickleCacher(self.file_path, sheet_name)
            pc.save_pickle(sheet_data[sheet_name])
    
    def __iter__(self):
        for sheet_name in self.sheets:
            yield sheet_name

class Sheet:
    #a class to wrap ALL sheet interactions, so that all access to spreadsheet goes through here
    def __init__(self, data_file_path, sheet_name):
        cache_class=get_cache_class()
        sc=cache_class(data_file_path, sheet_name)
        self.data=sc.get_sheet()
        
        self.data_file_path=data_file_path
        self.data_file_name=Path(data_file_path).name
        self.name=sheet_name
        
    def __getitem__(self, params):
        try:
            return self.data.iloc[params]
        except IndexError:
            raise T2WMLExceptions.ValueOutOfBoundException("Cell " + to_excel(params[1], params[0]) + " is outside the bounds of the current data file")

    @property    
    def row_len(self):
        return len(self.data)
    
    @property
    def col_len(self):
        return len(self.data[0])
    