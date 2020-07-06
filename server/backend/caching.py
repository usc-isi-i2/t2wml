from t2wml.mapping.cell_mapper import Region

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
                return data["download"], data["errors"]
            except:
                pass
        return []
    
 