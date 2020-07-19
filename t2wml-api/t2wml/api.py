import json

from t2wml.mapping.download import get_file_output_from_statements
from t2wml.settings import t2wml_settings
from t2wml.utils.t2wml_exceptions import FileTypeNotSupportedException
from t2wml.wikification.utility_functions import add_properties_from_file

from t2wml.wikification.item_table import Wikifier
from t2wml.spreadsheets.sheet import Sheet, SpreadsheetFile
from t2wml.mapping.statement_mapper import YamlMapper
from t2wml.wikification.wikifier_service import WikifierService
from t2wml.wikification.wikidata_provider import SparqlProvider, DictionaryProvider


def set_wikidata_provider(wp):
    t2wml_settings["wikidata_provider"]=wp

def set_sparql_endpoint(se):
    t2wml_settings["sparql_endpoint"]=se


        

class KnowledgeGraph:
    def __init__(self, statements, errors=[], metadata={}):
        self.statements=statements
        self.errors=errors
        self.metadata=metadata

    @classmethod
    def load_json(cls, filename):
        with open(filename, 'r') as f:
            loaded=json.load(f)
        statements=loaded["statements"]
        errors=loaded.get("errors", [])
        metadata=loaded.get("metadata", {})
        return cls(statements, errors, metadata)
            
    @classmethod
    def generate(cls, cell_mapper, sheet, wikifier):
        statements, errors, metadata = cell_mapper.get_all_statements(sheet, wikifier)
        return cls(statements, errors, metadata)
    
    @classmethod
    def generate_from_files(cls, data_file_path, sheet_name, yaml_file_path, wikifier_filepath):
        wikifier=Wikifier()
        wikifier.add_file(wikifier_filepath)
        cell_mapper=YamlMapper(yaml_file_path)
        sheet=Sheet(data_file_path, sheet_name)
        return cls.generate(cell_mapper, sheet, wikifier)
    
    def get_output(self, filetype):
        download_data=get_file_output_from_statements(self, filetype)
        return download_data

    def save_download(self, output_filename, filetype):
        download_data=self.get_output(filetype)
        with open(output_filename, 'w') as f:
            f.write(download_data)

    def save_json(self, output_filename):
        self.save_download(output_filename, "json")
    def save_kgtk(self, output_filename):
        self.save_download(output_filename, "tsv")
    def save_ttl(self, filename):
        self.save_download(output_filename, "ttl")

def create_output_from_files(data_file_path, sheet_name, yaml_file_path, wikifier_filepath, output_filepath=None, output_format="json"):
    kg=KnowledgeGraph.generate_from_files(data_file_path, sheet_name, yaml_file_path, wikifier_filepath)
    output=kg.get_output(output_format)
    if output_filepath:
         with open(output_filepath, 'w') as f:
            f.write(output)
    return output


