import os
import json
from pathlib import Path
from collections import OrderedDict
from backend_code.utility_functions import string_is_valid
from backend_code.parsing.yaml_parsing import TemplateParser, RegionParser, validate_yaml
from backend_code.spreadsheets.sheet import Sheet
from backend_code.bindings import bindings, update_bindings

class Region:
    def __init__(self, region_data):
        self.left=region_data["t_var_left"]
        self.right=region_data["t_var_right"]
        self.top=region_data["t_var_top"]
        self.bottom=region_data["t_var_bottom"]
        self.create_holes(region_data)

    def create_holes(self, region_data):
        self.indices=OrderedDict()
        skip_rows=set(region_data.get("skip_row", []))
        skip_cols=set(region_data.get("skip_column", []))
        skip_cells=set(region_data.get("skip_cell", []))
        for column in range(self.left, self.right+1):
            if column not in skip_cols:
                for row in range(self.top, self.bottom+1):
                    if row not in skip_rows:
                        try:
                            if (column, row) not in skip_cells and string_is_valid(bindings.excel_sheet[row-1][column-1]):
                                self.indices[(column, row)]=True
                        except Exception as e:
                            print(e)
    def __iter__(self):
        for key in self.indices:
            yield key
            
    def get(self, key, fallback=None):
        return self.indices.get(key, fallback)
    
    def get_head(self):
        for key in self.indices:
            return key

class MappingCacher:
    def __init__(self, filepath, data_file_path, sheet_name):
        self.filepath=filepath
        self.data_file_path=data_file_path
        self.sheet_name=sheet_name
    
    @property
    def cache_path(self):
            path=Path(self.filepath)
            filename=path.stem+"_"+self.sheet_name+"_cached.json"
            parent=path.parent
            filepath=parent/"cache"
            if not filepath.is_dir():
                os.makedirs(filepath)
            return str(filepath/filename)

    def is_fresh(self):
        if os.path.isfile(self.cache_path):
            if os.path.getmtime(self.cache_path) > os.path.getmtime(self.filepath) and\
                os.path.getmtime(self.cache_path) > os.path.getmtime(self.data_file_path):
                return True
        return False
    
    def save(self, highlight_data, statement_data):
        d={
            "highlight region": highlight_data,
            "download": statement_data
        }
        with open(self.cache_path, 'w') as f:
            json.dump(d, f)

    def get_highlight_region(self):
        if self.is_fresh():
            try:
                with open(self.cache_path, 'r') as f:
                    data=json.load(f)
                return data["highlight region"]
            except:
                pass
        return None

    def get_download(self):
        if self.is_fresh():
            try:
                with open(self.cache_path, 'r') as f:
                    data=json.load(f)
                return data["download"]
            except:
                pass
        return None
    
 
class CellMapper:
    def __init__(self, filepath, item_table, data_file_path, sheet_name, sparql_endpoint, use_cache=False):
        self.yaml_data=validate_yaml(filepath)
        
        try:
            sheet=Sheet(data_file_path, sheet_name)
        except IOError:
            raise IOError('Excel File cannot be found or opened')
        update_bindings(item_table=item_table, sheet=sheet, sparql_endpoint=sparql_endpoint)
        
        region_parser=RegionParser(self.yaml_data)
        self.region=Region(region_parser.parsed_region)
        
        template_parser=TemplateParser(self.yaml_data)
        self.template=template_parser.template
        self.eval_template=template_parser.eval_template
        
        self.sparql_endpoint=sparql_endpoint
        self.created_by=self.yaml_data['statementMapping'].get('created_by', 't2wml')
        
        self.use_cache=use_cache
        self.cacher=MappingCacher(filepath, data_file_path, sheet_name)
    
