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
        skip_cells=region_data.get("skip_cell", [])
        skip_cells=[tuple(i) for i in skip_cells]
        skip_cells=set(skip_cells)
        for column in range(self.left, self.right+1):
            if column not in skip_cols:
                for row in range(self.top, self.bottom+1):
                    if row not in skip_rows:
                        try:
                            if (column, row) not in skip_cells: # and string_is_valid(str(bindings.excel_sheet[row-1][column-1])):
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


class Cacher:
    title=""
    def __init__(self, yaml_file_path,  data_file_path, sheet_name):
        self.yaml_file_path=yaml_file_path
        self.data_file_path=data_file_path
        self.sheet_name=sheet_name
    
    @property
    def cache_path(self):
        return self.get_cache_path(self.title)

    def get_cache_path(self, title_str):
        path=Path(self.yaml_file_path)
        filename=path.stem+"_"+self.sheet_name+"_"+title_str+"_cached.json"
        parent=path.parent
        file_path=parent/"cache"
        if not file_path.is_dir():
            os.makedirs(file_path)
        return str(file_path/filename)

    def is_fresh(self):
        if os.path.isfile(self.cache_path):
            if os.path.getmtime(self.cache_path) > os.path.getmtime(self.yaml_file_path) and\
                os.path.getmtime(self.cache_path) > os.path.getmtime(self.data_file_path):
                return True
        return False

class RegionCacher(Cacher):
    title="region"
    
    def __init__(self, yaml_file_path, data_file_path, sheet_name):
        super().__init__(yaml_file_path, data_file_path, sheet_name)


    def load_from_cache(self):
        if self.is_fresh():
            with open(self.cache_path, 'r') as f:
                region_data=json.load(f)
            return Region(region_data)
        return None
    
    def save(self, region_data):
        s=json.dumps(region_data)
        with open(self.cache_path, 'w') as f:
            f.write(s)



class MappingResultsCacher(Cacher):
    title="result_j" #j is a modifier for backwards incompatible changes in cache format as of version 2.0a13

    def __init__(self, yaml_file_path, data_file_path, sheet_name):
        super().__init__(yaml_file_path, data_file_path, sheet_name)
    

        
    def save(self, highlight_data, statement_data, errors=[]):
        d={
            "highlight region": highlight_data,
            "download": statement_data,
            "errors": errors
        }
        s=json.dumps(d)
        with open(self.cache_path, 'w') as f:
            f.write(s)

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
        return []
    
 
class CellMapper:
    def __init__(self, yaml_file_path, item_table, data_file_path, sheet_name, sparql_endpoint, use_cache=False):
        self.yaml_data=validate_yaml(yaml_file_path)
        self.use_cache=use_cache

        try:
            sheet=Sheet(data_file_path, sheet_name)
        except IOError:
            raise IOError('Excel File cannot be found or opened')
        update_bindings(item_table=item_table, sheet=sheet, sparql_endpoint=sparql_endpoint)
        
        self.init_region(yaml_file_path, data_file_path, sheet_name)

        self.template=dict(self.yaml_data['statementMapping']['template'])
        template_parser=TemplateParser(self.template, self.region)
        self.eval_template=template_parser.eval_template
        
        self.sparql_endpoint=sparql_endpoint
        self.created_by=self.yaml_data['statementMapping'].get('created_by', 't2wml')
        
        self.result_cacher=MappingResultsCacher(yaml_file_path, data_file_path, sheet_name)
    
    def init_region(self, yaml_file_path, data_file_path, sheet_name):
        region=None
        if self.use_cache:
            region_cacher=RegionCacher(yaml_file_path, data_file_path, sheet_name)
            region=region_cacher.load_from_cache()
            
        if not region:
            region_parser=RegionParser(self.yaml_data)
            region=Region(region_parser.parsed_region)
            if self.use_cache:
                region_cacher.save(region_parser.parsed_region)

        self.region=region
