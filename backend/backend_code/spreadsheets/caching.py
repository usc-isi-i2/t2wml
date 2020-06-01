import os
import pickle
from pathlib import Path
import pandas as pd
from backend_code.utility_functions import is_csv


cache_settings={
    "use_cache": False
}


class SheetCacher:
    def __init__(self, data_file_path, sheet_name):
        self.data_file_path=data_file_path
        self.sheet_name=sheet_name
        file_extension=Path(self.data_file_path).suffix
        self.is_csv = is_csv(self.data_file_path)
        
        
    def get_sheet(self):
        raise NotImplementedError


class FakeCacher(SheetCacher):
    def get_sheet(self):
        if self.is_csv:
            data=pd.read_csv(self.data_file_path, dtype=object, header=None)
        else:
            data=pd.read_excel(self.data_file_path, sheet_name=self.sheet_name, dtype=object, header=None)
        data=data.fillna("")
        return data


def get_pickle_path(data_file_path, sheet_name):
    #moved outside of class so I can use it in file initalizer as well
    path=Path(data_file_path)
    filename=path.stem+sheet_name+".ppkl"
    parent=path.parent
    file_path=parent/"pf"
    if not file_path.is_dir():
        os.makedirs(file_path)
    return str(file_path/filename)

class FileSystemPickleCacher(SheetCacher):
    @property
    def pickle_path(self):
        return get_pickle_path(self.data_file_path, self.sheet_name)
    
    def fresh_pickle(self):
        #checks if the pickle is "fresh"-- is more newly modified than the datafile
        if os.path.isfile(self.pickle_path):
            if os.path.getmtime(self.pickle_path) > os.path.getmtime(self.data_file_path):
                return True
        return False
    
    def get_sheet(self):
        if self.fresh_pickle():
            self.data=self.load_pickle()
        else:
            #if not, load the sheet, save the pickle file for future use
            self.data=self.load_sheet(self.sheet_name)
            self.save_pickle(self.data)
        
        return self.data
    
    def load_pickle(self):
        data=pd.read_pickle(self.pickle_path)
        data=data.fillna("")
        return data

    def save_pickle(self, data):
        pd.to_pickle(data, self.pickle_path)
    
    def load_file(self, sheet_name=None):
        if self.is_csv:
            data=pd.read_csv(self.data_file_path, header=None, dtype=object)
        else:
            data=pd.read_excel(self.data_file_path, sheet_name=sheet_name, header=None, dtype=object)
        return data
    
    def load_sheet(self, sheet_name):
        data= self.load_file(sheet_name)
        data=data.fillna("")
        return data
    

    @staticmethod
    def save_file(data_file_path):
        pickler=FileSystemPickleCacher(data_file_path, None)
        xl=pickler.load_file()
        if pickler.is_csv:
            sheet_name=Path(data_file_path).name
            pd.to_pickle(xl, get_pickle_path(data_file_path, sheet_name))
            return [sheet_name]
        else:
            sheet_names=[]
            for sheet_name in xl:
                sheet_names.append(sheet_name)
                df=xl[sheet_name]
                pd.to_pickle(df, get_pickle_path(data_file_path, sheet_name))
            return sheet_names



