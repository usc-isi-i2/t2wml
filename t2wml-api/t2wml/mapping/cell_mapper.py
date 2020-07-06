import os
import json
from pathlib import Path
from collections import OrderedDict
from t2wml.parsing.yaml_parsing import TemplateParser, RegionParser, validate_yaml
from t2wml.spreadsheets.sheet import Sheet
from t2wml.utils.bindings import bindings, update_bindings
from string import punctuation

def string_is_valid(text: str) -> bool:
    def check_special_characters(text: str) -> bool:
        return all(char in punctuation for char in str(text))
    if text is None or check_special_characters(text):
        return False
    text=text.strip().lower()
    if text in ["", "#na", "nan"]:
        return False
    return True

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
                            if (column, row) not in skip_cells and string_is_valid(str(bindings.excel_sheet[row-1][column-1])):
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


class CellMapper:
    def __init__(self, yaml_file_path, item_table, data_file_path, sheet_name):
        self.yaml_data=validate_yaml(yaml_file_path)

        try:
            sheet=Sheet(data_file_path, sheet_name)
        except IOError:
            raise IOError('Excel File cannot be found or opened')
        update_bindings(item_table=item_table, sheet=sheet)
        
        self.init_region(yaml_file_path, data_file_path, sheet_name)

        self.template=dict(self.yaml_data['statementMapping']['template'])
        template_parser=TemplateParser(self.template, self.region)
        self.eval_template=template_parser.eval_template
        
        self.created_by=self.yaml_data['statementMapping'].get('created_by', 't2wml')
    
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
