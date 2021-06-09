from pathlib import Path
from t2wml.api import Sheet, SpreadsheetFile, Wikifier
from t2wml.api import Project
from caching import CacheHolder


class CalcParams:
    def __init__(self, project, data_path, sheet_name, yaml_path=None, annotation_path=None):
        self.project = project
        self.project_path = project.directory
        self.data_path = Path(project.directory) / data_path
        self.sheet_name = sheet_name
        self._sheet = None
        self.yaml_path = None
        if yaml_path:
            self.yaml_path = Path(project.directory) / yaml_path
        self.annotation_path = annotation_path or ""
        if annotation_path:
            self.annotation_path= Path(project.directory) / annotation_path


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
