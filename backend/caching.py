import os
import json
from hashlib import sha256
from t2wml.api import KnowledgeGraph
from app_config import UPLOAD_FOLDER, app
from t2wml.mapping.statement_mapper import YamlMapper


class Cacher:
    title = ""

    def __init__(self, project, data_file_path, sheet_name, yaml_file_path):
        self.project = project
        self.data_file_path = data_file_path
        self.yaml_file_path = yaml_file_path
        self.sheet_name = sheet_name

    @property
    def cache_path(self):
        api_project_str = str(self.project.__dict__)
        cache_hash = sha256(api_project_str.encode('utf-8'))
        m_time_str = str(os.path.getmtime(self.yaml_file_path)) + str(os.path.getmtime(self.data_file_path))
        cache_hash.update(m_time_str.encode('utf-8'))
        file_name = self.sheet_name + "_" + cache_hash.hexdigest() + ".json"
        file_path = os.path.join(UPLOAD_FOLDER, "calc_cache")
        if not os.path.isdir(file_path):
            os.makedirs(file_path)
        return os.path.join(file_path, file_name)

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
        if app.config['USE_CACHE']:
            try:
                with open(self.cache_path, 'r', encoding="utf-8") as f:
                    data = json.load(f)
                return data["highlight region"], data["statements"], data["errors"]
            except:
                pass
        return None, None, None

    def get_kg(self):
        if app.config['USE_CACHE']:
            try:
                return KnowledgeGraph.load_json(self.cache_path)
            except:
                pass
        return None


class CacheHolder():
    def __init__(self, project, data_path, sheet_name, yaml_path):
        self.result_cacher = Cacher(project, data_path, sheet_name, yaml_path)
        self.cell_mapper = YamlMapper(yaml_path)
