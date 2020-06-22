from collections import defaultdict
from t2wml_api.spreadsheets.caching import cache_settings, PandasLoader, PickleCacher
from t2wml_api.mapping.cell_mapper import CellMapper
from t2wml_api.wikification.item_table import ItemTable
from t2wml_api.wikification.wikify_handling import wikifier
from t2wml_api.mapping.t2wml_handling import download_kgtk, generate_download_file, resolve_cell, get_all_template_statements

class DataFile:
    def __init__(self, file_path, use_cache=False):
        self.file_path=file_path
        self.pandas_loader=PandasLoader(file_path)
        self.sheets=self.pandas_loader.get_sheet_names()
        self.use_cache=use_cache
        if self.use_cache:
            self.init_cache()
    
    def init_cache(self):
        cache_settings["use_cache"]=True
        sheet_data=self.pandas_loader.load_file()
        for sheet_name in sheet_data:
            pc=PickleCacher(self.file_path, sheet_name)
            pc.save_pickle(sheet_data[sheet_name])
    
    def __iter__(self):
        for sheet_name in self.sheets:
            yield sheet_name

class Project:
    def __init__(self, name="", sparql_endpoint=None, use_file_cache=False, use_result_cache=False):
        self.name=name
        if not sparql_endpoint:
            sparql_endpoint="DEFAULT SPARQL ENDPOINT" #to be replaced
        self.sparql_endpoint=sparql_endpoint

        self.data_files={} 
        self.yaml_files={} 
        self.wikifier_files={}

        #for now we do not yet support multi-yaml or multi-wiki.
        #therefore, the last yaml in the list (most recent) is the one which will be used
        self.yaml_associations=defaultdict(lambda: defaultdict(list))
        self.wikifier_associations=defaultdict(list)
        
        self.use_file_cache=use_file_cache
        self.use_result_Cache=use_result_cache


    def add_data_file(self, path):
        #insert code for checking that path is valid data file
        self.data_files[path]=DataFile(path)
        
    def add_yaml_file(self, path):
        #insert code for checking that path is valid yaml file
        self.yaml_files[path]=path
    
    def add_wikifier_file(self, path):
        #insert code for checking that path is valid yaml file
        self.wikifier_files[path]=path
    
    def associate_yaml(self, yaml_file, data_file, sheet=None):
        #if sheet is not specified, associate to all sheets in data_file
        if yaml_file not in self.yaml_files:
            self.add_yaml_file(yaml_file)
        
        if sheet:
            self.yaml_associations[data_file][sheet].append(yaml_file)
        else:
            for sheet in self.data_files[data_file]:
                self.yaml_associations[data_file][sheet].append(yaml_file)
            
    def associate_wikifier(self, wikifier_file, data_file=None):
        #if data_file  is not specified, associate to all data_files in project
        if wikifier_file not in self.wikifier_files:
            self.add_wikifier_file(wikifier_file)
        if data_file:
            self.wikifier_associations[data_file].append(wikifier_file)
        else:
            for data_file in self.data_files:
                self.wikifier_associations[data_file].append(wikifier_file)
    
    def export(self):
        raise NotImplementedError
    
    @staticmethod
    def load(filepath):
        raise NotImplementedError

    def wikify_region(self, data_file_path, sheet_name, action, region, context, flag):
        raise NotImplementedError
        item_table=None
        x=wikifier(item_table, region, data_file_path, sheet_name, flag, context, self.sparql_endpoint)
        #todo: handle saving the results as a wikifier file in project's wikifier files
    
    def get_cell(self, data_file, sheet, cell):
        raise NotImplementedError
    
    def download(self, filetype, data_file=None, sheet=None): 
        #if data_file  is not specified, download entire project. If data_file is specified and sheet is not, download entire data file
        raise NotImplementedError
    
