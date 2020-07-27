import os
import json
from pathlib import Path
from t2wml.mapping.statement_mapper import YamlMapper
from t2wml.mapping.region import Region
from t2wml.api import KnowledgeGraph

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


class MappingResultsCacher(Cacher):
    title="result_ל" #j is a modifier for backwards incompatible changes in cache format as of version 2.0a18

    def __init__(self, yaml_file_path, data_file_path, sheet_name):
        super().__init__(yaml_file_path, data_file_path, sheet_name)
    
    def save(self, highlight_data, statement_data, errors=[], metadata={}):
        d={
            "highlight region": highlight_data,
            "statements": statement_data,
            "errors": errors, 
            "metadata":metadata
        }
        s=json.dumps(d)
        with open(self.cache_path, 'w') as f:
            f.write(s)

    def get_highlight_region(self):
        if self.is_fresh():
            try:
                with open(self.cache_path, 'r') as f:
                    data=json.load(f)
                return data["highlight region"], data["statements"], data["errors"]
            except:
                pass
        return None, None, None

    def get_kg(self):
        if self.is_fresh():
            try:
                return KnowledgeGraph.load_json(self.cache_path)
            except:
                pass
        return None
    
    
 
class CacheHolder():
    def __init__(self, sheet, yaml):
        self.result_cacher=MappingResultsCacher(yaml.file_path, sheet.data_file.file_path, sheet.name)
        self.cell_mapper=YamlMapper(yaml.file_path)
    
    

    