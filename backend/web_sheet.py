import os
from pathlib import Path
import pandas as pd
from t2wml.spreadsheets.utilities import PandasLoader
from t2wml.api import Sheet as ApiSheet
from app_config import DATADIR, app

CACHE_FOLDER = os.path.join(DATADIR, "cache")
Path(CACHE_FOLDER).mkdir(parents=True, exist_ok=True)

df_cache = {"cache":{}}

def load_pickle(pickle_path):
    return pd.read_pickle(pickle_path)

def pickle_folder(data_file_path): #maybe should replace with sha hash
    storage_folder=Path(CACHE_FOLDER)
    parts = Path(data_file_path).parts
    parts=parts[1:-1]
    underscored="_".join(parts)
    underscored = "v2_"+underscored #changed version 0.6
    folder_path = storage_folder/underscored
    return folder_path

class PickleCacher:
    def __init__(self, data_file_path, sheet_name):
        self.data_file_path = data_file_path
        self.sheet_name = sheet_name
        self.pandas_wrapper = PandasLoader(self.data_file_path)
        if not self.pickle_folder.is_dir():
            os.makedirs(self.pickle_folder)

    @property
    def pickle_folder(self):
        return pickle_folder(self.data_file_path)

    @property
    def pickle_file(self):
        path = Path(self.data_file_path)
        filename = path.stem+"_"+self.sheet_name+".pkl"
        return str(self.pickle_folder/filename)

    def fresh_pickle(self):
        # checks if the pickle is "fresh"-- is more newly modified than the datafile
        if os.path.isfile(self.pickle_file):
            if os.path.getmtime(self.pickle_file) > os.path.getmtime(self.data_file_path):
                return True
        return False

    def get_sheet(self):
        if self.fresh_pickle():
            data = load_pickle(self.pickle_file)
        else:
            # if not, load the sheet, save the pickle file for future use
            data = self.pandas_wrapper.load_sheet(self.sheet_name)
            self.save_pickle(data)
        return data

    def save_pickle(self, data):
        pd.to_pickle(data, self.pickle_file)

class FakeCacher:
    def __init__(self, data_file_path, sheet_name):
        self.data_file_path = data_file_path
        self.sheet_name = sheet_name
        self.pandas_wrapper = PandasLoader(self.data_file_path)

    def get_sheet(self):
        return self.pandas_wrapper.load_sheet(self.sheet_name)

def get_cache_class():
    cache_class = FakeCacher
    if app.config["USE_CACHE"]:
        cache_class = PickleCacher
    return cache_class

class Sheet(ApiSheet):
    def __init__(self, data_file_path: str, sheet_name: str):
        """[summary]
        Args:
            data_file_path (str): location of sheet file
            sheet_name (str): name of sheet. for csv files, name of sheet file
            data (dataframe, optional): dataframe of contents of sheet. For creating a sheet from already loaded data.
                                        Defaults to None.
        """
        self.data_file_path = str(data_file_path)
        self.data_file_name = Path(data_file_path).name
        self.name = sheet_name
        self.cleaned_data=None #this is set from outside the class, if cleaning is run
        try:
            self.raw_data = df_cache["cache"][self.data_file_path+sheet_name]
        except KeyError:
            cache_class = get_cache_class()
            sc = cache_class(data_file_path, sheet_name)
            self.raw_data = sc.get_sheet()
            df_cache["cache"] = {self.data_file_path+sheet_name: self.raw_data} #only keep one at any given time



'''
#TODO: also handle caching cleaning data somehow
def get_cleaned_dataframe():
        if t2wml_settings.cache_data_files:
            yaml_hash = sha256(str(yaml_instructions).encode('utf-8'))
            pickle_dir=pickle_folder(sheet.data_file_path) / yaml_hash.hexdigest()
            pickle_file=pickle_dir / (Path(sheet.data_file_path).stem+"_"+sheet.name+"_cleaned.pkl")
            #1: check for fresh pickled version of df
            if os.path.isfile(pickle_file):
                if os.path.getmtime(pickle_file) > os.path.getmtime(sheet.data_file_path):
                    df=load_pickle(pickle_file)
                    return df
        else:
            sc=DFCleaner(yaml_instructions, sheet)
            Path.mkdir(pickle_dir, parents=True, exist_ok=True)
            sc.df.to_pickle(pickle_file)
            return sc.df
'''
