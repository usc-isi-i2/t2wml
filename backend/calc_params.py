from pathlib import Path
from t2wml.api import Sheet, SpreadsheetFile, Wikifier
from caching import CacheHolder


class CalcParams:
    def __init__(self, project, data_path, sheet_name, yaml_path=None, annotation_path=None):
        self.project = project
        self.project_path = project.directory
        self.data_path = Path(project.directory) / data_path
        self.sheet_name = sheet_name
        self._sheet = None
        self._yaml_path = yaml_path
        self._annotation_path = annotation_path or ""


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
        project = self.project
        if project.wikifier_files:
            wikifier_files = [project.get_full_path(wf)
                              for wf in project.wikifier_files]
            #wikifier_files= [wikifier_files[-1]] #temporary solution where we only use the last-added wikifier
        else:
            wikifier_files = []
        wikifier = Wikifier()
        for path in wikifier_files:
            wikifier.add_file(path)
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
