from pathlib import Path
from t2wml.api import SpreadsheetFile, Wikifier
from web_sheet import Sheet

class CalcParams:
    def __init__(self, project, data_path, sheet_name, yaml_path=None, annotation_path=None,
                data_start=0, data_end=None, map_start=0, map_end=None,
                part_start=0, part_end=None, part_count=100):
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
        self.part_count=part_count


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
    def wikifier(self):
        wikifier_file, exists = self.project.get_wikifier_file(self.sheet.data_file_path)
        if exists:
            return Wikifier.load_from_file(filepath=wikifier_file)
        else:
            return Wikifier()

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
