import os
from pathlib import Path
import pyexcel
import pickle
from backend_code.bindings import bindings

def get_pickle_path(data_filepath, sheet_name):
    #moved outside of class so I can use it in file initalizer as well
    path=Path(data_filepath)
    filename=path.stem+"_"+sheet_name+".pkl"
    parent=path.parent
    filepath=parent/"pf"
    if not filepath.is_dir():
        os.makedirs(filepath)
    return str(filepath/filename)

class SheetCacher:
    def __init__(self, data_filepath, sheet_name):
        self.data_filepath=data_filepath
        self.sheet_name=sheet_name
        self.load_sheet()
    def load_sheet(self):
        raise NotImplementedError


class FileSystemPickle(SheetCacher):
    def load_sheet(self):
        if self.fresh_pickle():
            self.data=self.load_pickle()
        else:
            #if not, load the sheet with pyexcel, save the pickle file for future use
            self.data=self.load_spreadsheet_file()
            self.pickle_sheet(self.data)
        return self.data

    @property
    def pickle_path(self):
        return get_pickle_path(self.data_filepath, self.sheet_name)

    def load_pickle(self):
        #load the pickle file
        with open(self.pickle_path, 'rb') as f:
            data=pickle.load(f)
        return data

    def load_spreadsheet_file(self):
        records=pyexcel.get_book_dict(file_name=self.data_filepath)
        sheet=records[self.sheet_name]
        return sheet

    def pickle_sheet(self, data):
        with open(self.pickle_path, 'wb') as f:
            pickle.dump(data, f)
    
    def fresh_pickle(self):
        #checks if the pickle is "fresh"-- is more newly modified than the datafile
        if os.path.isfile(self.pickle_path):
            if os.path.getmtime(self.pickle_path) > os.path.getmtime(self.data_filepath):
                return True
        return False

def get_sheet(data_filepath, sheet_name):
    sc=FileSystemPickle(data_filepath, sheet_name)
    return sc.data

def load_file(data_filepath):
    book_dict = pyexcel.get_book_dict(file_name=data_filepath)
    sheet_names=[]
    for sheet_name in book_dict:
        sheet_names.append(sheet_name)
        data=book_dict[sheet_name]
        filepath=get_pickle_path(data_filepath, sheet_name)
        with open(filepath, 'wb') as f:
            pickle.dump(data, f)
    return sheet_names