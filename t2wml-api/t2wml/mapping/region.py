from collections import OrderedDict
from t2wml.utils.t2wml_exceptions import InvalidYAMLFileException
from string import punctuation
from t2wml.utils.bindings import bindings
from t2wml.parsing.yaml_parsing import RegionParser

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
    def __init__(self, index_pairs):
        if len(index_pairs)==0:
            raise ValueError("Defined region does not include any cells")
        self.index_pairs=index_pairs
    
    def __iter__(self):
        for pair in self.index_pairs:
            yield pair
    
    @classmethod
    def create_from_region_data(cls, region_data):
        index_pairs=[]
        left=region_data["t_var_left"]
        right=region_data["t_var_right"]
        top=region_data["t_var_top"]
        bottom=region_data["t_var_bottom"]
        
        skip_rows=set(region_data.get("skip_row", []))
        skip_cols=set(region_data.get("skip_column", []))
        skip_cells=region_data.get("skip_cell", [])
        skip_cells=set(skip_cells)

        for column in range(left, right+1):
            if column not in skip_cols:
                for row in range(top, bottom+1):
                    if row not in skip_rows:
                            if (column, row) not in skip_cells and string_is_valid(str(bindings.excel_sheet[row-1][column-1])):
                                index_pairs.append([column, row])
        
        return cls(index_pairs)

    @staticmethod
    def create_from_yaml(yaml_data):
        region_parser=RegionParser(yaml_data)
        return Region.create_from_region_data(region_parser.parsed_region)