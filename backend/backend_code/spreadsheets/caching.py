import os
import pickle
from pathlib import Path
import pyexcel
import pandas as pd


cache_settings={
    "use_cache": False
}


def get_pickle_path(data_filepath, sheet_name):
    #moved outside of class so I can use it in file initalizer as well
    path=Path(data_filepath)
    filename=path.stem+sheet_name+".pkl"
    parent=path.parent
    filepath=parent/"pf"
    if not filepath.is_dir():
        os.makedirs(filepath)
    return str(filepath/filename)

class SheetCacher:
    def __init__(self, data_filepath, sheet_name):
        self.data_filepath=data_filepath
        self.sheet_name=sheet_name
        file_extension=Path(self.data_filepath).suffix
        self.is_csv = True if file_extension.lower() == ".csv" else False
        
        
    def get_sheet(self):
        raise NotImplementedError


class FakeCacher(SheetCacher):
    def get_sheet(self):
        records=pyexcel.get_book_dict(file_name=self.data_filepath)
        sheet=records[self.sheet_name]
        return sheet
    def ___get_sheet_pandas(self):
        if self.is_csv:
            data=pd.read_csv(self.data_filepath)
        else:
            data=pd.read_excel(self.data_filepath, sheet_name=sheet_name)
        return data



class FileSystemPickle(SheetCacher):
    @property
    def pickle_path(self):
        return get_pickle_path(self.data_filepath, self.sheet_name)
    
    def fresh_pickle(self):
        #checks if the pickle is "fresh"-- is more newly modified than the datafile
        if os.path.isfile(self.pickle_path):
            if os.path.getmtime(self.pickle_path) > os.path.getmtime(self.data_filepath):
                return True
        return False
    
    def get_sheet(self):
        if self.fresh_pickle():
            self.data=self.load_pickle()
        else:
            #if not, load the sheet with pyexcel, save the pickle file for future use
            self.data=self.load_sheet(self.sheet_name)
            self.pickle(self.data)
        return self.data
    

class PyexcelFileSystemPickle(FileSystemPickle):
    def load_pickle(self):
        #load the pickle file
        with open(self.pickle_path, 'rb') as f:
            data=pickle.load(f)
        return data
    
    def load_file(self):
        return pyexcel.get_book_dict(file_name=self.data_filepath)

    def load_sheet(self, sheet_name):
        records=self.load_file()
        sheet=records[sheet_name]
        return sheet

    def pickle(self, data):
        with open(self.pickle_path, 'wb') as f:
            pickle.dump(data, f)
    
    @staticmethod
    def save_file(data_filepath):
        book_dict = pyexcel.get_book_dict(file_name=data_filepath)
        sheet_names=[]
        for sheet_name in book_dict:
            sheet_names.append(sheet_name)
            data=book_dict[sheet_name]
            filepath=get_pickle_path(data_filepath, sheet_name)
            with open(filepath, 'wb') as f:
                pickle.dump(data, f)
        return sheet_names


class PandasFileSystemPickle(FileSystemPickle):
    def load_pickle(self):
        data=pd.read_pickle(self.pickle_path)
        return data

    def pickle(self, data):
        pd.to_pickle(data, self.pickle_path)
    
    def load_file(self, sheet_name=None):
        if self.is_csv:
            data=pd.read_csv(self.data_filepath, header=None)
        else:
            data=pd.read_excel(self.data_filepath, sheet_name=sheet_name, header=None)
        return data
    
    def load_sheet(self, sheet_name):
        return self.load_file(sheet_name)
    

    @staticmethod
    def save_file(data_filepath):
        pickler=PandasFileSystemPickle(data_filepath, None)
        xl=pickler.load_file()
        if pickler.is_csv:
            sheet_name=Path(data_filepath).name
            pd.to_pickle(xl, get_pickle_path(data_filepath, sheet_name))
            return [sheet_name]
        else:
            sheet_names=[]
            for sheet_name in xl:
                sheet_names.append(sheet_name)
                df=xl[sheet_name]
                pd.to_pickle(df, get_pickle_path(data_filepath, sheet_name))
            return sheet_names



