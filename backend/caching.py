import os
import json
from hashlib import sha256
from t2wml.api import KnowledgeGraph
from app_config import CACHE_FOLDER, app
from utils import numpy_converter

#cache version must be changed every time a breaking change is introduced to results format
__cache_version__ = "18.2" #format: [earliest compatible t2wml-api version].[any changes in web on top of that]

def use_cache():
    return app.config['USE_CACHE']

class CacheHolder:
    def __init__(self, project, data_file_path, sheet_name, yaml_file_path):
        self.project = project
        self.data_file_path = data_file_path
        self.yaml_file_path = yaml_file_path
        self.sheet_name = sheet_name

    @property
    def cache_path(self):
        api_project_str = str(self.project.__dict__)
        cache_hash = sha256(api_project_str.encode('utf-8'))
        with open(self.yaml_file_path, 'r') as f:
            yaml=f.read()
            yaml_hash=sha256(yaml.encode('utf-8'))
        m_time_str = str(os.path.getmtime(self.data_file_path))
        cache_hash.update(m_time_str.encode('utf-8'))
        file_name = self.sheet_name +"yaml_"+yaml_hash.hexdigest()+ "_" + cache_hash.hexdigest() + ".json"
        file_path = os.path.join(CACHE_FOLDER, "calc_cache_v"+__cache_version__)
        if not os.path.isdir(file_path):
            os.makedirs(file_path)
        return os.path.join(file_path, file_name)

    def save(self, kg, layers):
        if use_cache():
            try:
                sheet=None
                if kg.sheet:
                    sheet=kg.sheet.to_json()
                d = {
                    "statements": kg.statements,
                    "errors": kg.errors,
                    "metadata": kg.metadata,
                    "sheet": sheet,
                    "layers": layers
                }
                s = json.dumps(d, default=numpy_converter)
                with open(self.cache_path, 'w', encoding="utf-8") as f:
                    f.write(s)
            except Exception as e: #I really don't want bugs in this optional section breaking the program
                print("error when caching:", str(e))

    def load_kg(self):
        if use_cache():
            try:
                return KnowledgeGraph.load_json(self.cache_path)
            except Exception as e:
                pass
        return None
    
    def get_layers(self):
        if use_cache():
            try:
                with open(self.cache_path, 'r', encoding="utf-8") as f:
                    cache = json.load(f)
                    return cache["layers"]
            except Exception as e:
                pass
        return None


