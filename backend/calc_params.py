from t2wml.api import Sheet, SpreadsheetFile, Wikifier, KnowledgeGraph, Project
from caching import CacheHolder


class CalcParams:
    def __init__(self, project_path, data_path, sheet_name, yaml_path=None, wiki_paths=None):
        self.project_path = project_path
        self.data_path = data_path
        self.sheet_name = sheet_name
        self.yaml_path = yaml_path
        self.wiki_paths = wiki_paths or []

    @property
    def project(self):
        return Project.load(self.project_path)

    @property
    def sheet(self):
        return Sheet(self.data_path, self.sheet_name)

    @property
    def cache(self):
        return CacheHolder(self.project, self.data_path, self.sheet_name, self.yaml_path)

    @property
    def wikifier(self):
        wikifier = Wikifier()
        for path in self.wiki_paths:
            wikifier.add_file(path)
        return wikifier

    @property
    def sheet_names(self):
        # sticking this here for convenience, even though the only place it is used is table_data
        sf = SpreadsheetFile(self.data_path)
        return list(sf.sheet_names)

    @property
    def sparql_endpoint(self):
        p = Project.load(self.project_path)
        return p.sparql_endpoint

    def get_kg(self):
        kg = KnowledgeGraph.generate(self.cache.cell_mapper, self.sheet, self.wikifier)
        return kg
