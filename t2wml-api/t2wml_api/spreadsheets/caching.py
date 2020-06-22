import os
import pickle
from pathlib import Path
import pandas as pd


cache_settings={
    "use_cache": False
}

class PandasLoader:
    #a wrapper to centralize and make uniform any loading of data files/sheets from pandas
    def __init__(self, file_path):
        self.file_path=file_path
        file_extension=Path(file_path).suffix
        self.is_csv = True if file_extension.lower() == ".csv" else False
        self.pd_args=dict(dtype=object, header=None)

    def post_process_data(self, data):
        data=data.fillna("")
        data=data.replace(r'^\s+$', "", regex=True)
        return data

    def load_sheet(self, sheet_name):
        """
        returns a single sheet's data frame
        """
        if self.is_csv:
            data=pd.read_csv(self.file_path, **self.pd_args)
        else:
            data=pd.read_excel(self.file_path, sheet_name=sheet_name, **self.pd_args)
        return self.post_process_data(data)
    
    def load_file(self):
        """
        returns a dictionary of sheet_names and their data frames
        """
        if self.is_csv:
            data=pd.read_csv(self.file_path, **self.pd_args)
            data=self.post_process_data(data)
            sheet_name=Path(self.file_path).name
            return {sheet_name:data}
        else:
            return_dict={}
            loaded_file=pd.read_excel(self.file_path, sheet_name=None, **self.pd_args)
            for sheet_name in loaded_file:
                data=loaded_file[sheet_name]
                data=self.post_process_data(data)
                return_dict[sheet_name]=data
            return return_dict

    def get_sheet_names(self):
        if self.is_csv:
            return [Path(self.file_path).name]
        else:
            xl=pd.ExcelFile(self.file_path)
            return xl.sheet_names
    
    def load_pickle(self, pickle_path):
        data=pd.read_pickle(pickle_path)
        return self.post_process_data(data)

class FakeCacher:
    def __init__(self, data_file_path, sheet_name):
        self.data_file_path=data_file_path
        self.sheet_name=sheet_name
        self.pandas_wrapper=PandasLoader(self.data_file_path)
    def get_sheet(self):
        return self.pandas_wrapper.load_sheet(self.sheet_name)

class PickleCacher:
    def __init__(self, data_file_path, sheet_name):
        self.data_file_path=data_file_path
        self.sheet_name=sheet_name
        self.pandas_wrapper=PandasLoader(self.data_file_path)
        if not self.pickle_folder.is_dir():
            os.makedirs(self.pickle_folder)
    
    @property
    def pickle_folder(self):
        parent=Path(self.data_file_path).parent
        folder_path=parent/"pf"
        return folder_path

    @property
    def pickle_file(self):
        path=Path(self.data_file_path)
        filename=path.stem+"_"+self.sheet_name+".pkl"
        return str(self.pickle_folder/filename)

    def fresh_pickle(self):
        #checks if the pickle is "fresh"-- is more newly modified than the datafile
        if os.path.isfile(self.pickle_file):
            if os.path.getmtime(self.pickle_file) > os.path.getmtime(self.data_file_path):
                return True
        return False

    def get_sheet(self):
        if self.fresh_pickle():
            data=self.pandas_wrapper.load_pickle(self.pickle_file)
        else:
            #if not, load the sheet, save the pickle file for future use
            data=self.pandas_wrapper.load_sheet(self.sheet_name)
            self.save_pickle(data)
        return data
    
    def save_pickle(self, data):
        pd.to_pickle(data, self.pickle_file)