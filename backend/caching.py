import os
import json
from pathlib import Path
from t2wml.mapping.statement_mapper import YamlMapper
from t2wml.api import KnowledgeGraph
from backend.app_config import UPLOAD_FOLDER

class Cacher:
    title = ""

    def __init__(self, yaml_file_path,  data_file_path, sheet_name):
        self.yaml_file_path = yaml_file_path
        self.data_file_path = data_file_path
        self.sheet_name = sheet_name

    @property
    def cache_path(self):
        return self.get_cache_path(self.title)

    def get_cache_path(self, title_str):
        storage_path=Path(UPLOAD_FOLDER)
        path = Path(self.yaml_file_path)
        filename = path.stem+"_"+self.sheet_name+"_"+title_str+"_cached.json"
        without_drive=path.parts[1:-1]
        without_drive_str="_".join(without_drive)
        file_path = storage_path/"calc_cache"/without_drive_str
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
    title = "result"

    def __init__(self, yaml_file_path, data_file_path, sheet_name):
        super().__init__(yaml_file_path, data_file_path, sheet_name)

    def save(self, highlight_data, statement_data, errors, metadata):
        d = {
            "highlight region": highlight_data,
            "statements": statement_data,
            "errors": errors,
            "metadata": metadata
        }
        s = json.dumps(d)
        with open(self.cache_path, 'w', encoding="utf-8") as f:
            f.write(s)

    def get_highlight_region(self):
        if self.is_fresh():
            try:
                with open(self.cache_path, 'r', encoding="utf-8") as f:
                    data = json.load(f)
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
    def __init__(self, data_path, sheet_name, yaml_path):
        self.result_cacher = MappingResultsCacher(
            yaml_path, data_path, sheet_name)
        self.cell_mapper = YamlMapper(yaml_path)
