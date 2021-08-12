from pathlib import Path
from t2wml.api import SpreadsheetFile, Wikifier
from caching import CacheHolder
from web_sheet import Sheet

class CalcParams:
    def __init__(self, project, data_path, sheet_name, yaml_path=None, annotation_path=None,
                data_start=0, data_end=None, map_start=0, map_end=None, part_start=0, part_end=None):
        self.project = project
        self.project_path = project.directory
        self._data_path = data_path
        self.data_path = Path(project.directory) / data_path
        self.sheet_name = sheet_name
        self._sheet = None
        self._yaml_path = yaml_path
        self._annotation_path = annotation_path or ""

        self.data_start=data_start
        self.data_end=data_end
        self.map_start=map_start
        self.map_end=map_end
        self.part_start=part_start
        self.part_end=part_end


    @property
    def yaml_path(self):
        if self._yaml_path:
            return  Path(self.project.directory) / self._yaml_path
        return self._yaml_path #None

    @property
    def annotation_path(self):
        if self._annotation_path:
            return Path(self.project.directory) / self._annotation_path
        return self._annotation_path #empty string


    @property
    def sheet(self):
        if self._sheet is None:
            self._sheet= Sheet(self.data_path, self.sheet_name)
        return self._sheet

    @property
    def cache(self):
        return None #we are getting rid of caching until we've figured out a better way of determining when a project has changed
        if self.yaml_path:
            return CacheHolder(self.project, self.data_path, self.sheet_name, self.yaml_path)

    @property
    def wikifier(self):
        wikifier = Wikifier()
        wikifier_file, exists = self.project.get_wikifier_file(self.data_path)
        if exists:
            wikifier.add_file(wikifier_file)
        return wikifier

    @property
    def sheet_names(self):
        # sticking this here for convenience, even though the only place it is used is table_data
        sf = SpreadsheetFile(self.data_path)
        return list(sf.sheet_names)

    @property
    def sparql_endpoint(self):
        # p = Project.load(self.project_path)
        return self.project.sparql_endpoint
        # return p.sparql_endpoint
