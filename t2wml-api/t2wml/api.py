import json

from t2wml.mapping.cell_mapper import CellMapper
from t2wml.spreadsheets.sheet import Sheet
from t2wml.mapping.t2wml_handling import get_all_template_statements
from t2wml.mapping.download import get_file_output_from_statements
from t2wml.mapping.triple_generator import generate_triples
from t2wml.settings import t2wml_settings
from t2wml.utils.t2wml_exceptions import FileTypeNotSupportedException
from t2wml.wikification.item_table import ItemTable
from t2wml.wikification.utility_functions import add_properties_from_file





def set_wikidata_provider(wp):
    t2wml_settings["wikidata_provider"]=wp

def set_sparql_endpoint(se):
    t2wml_settings["sparql_endpoint"]=se


        

class KnowledgeGraph:
    def __init__(self, statements, errors=[]):
        self.statements=statements
        self.errors=errors

    @classmethod
    def load_json(cls, filename):
        with open(filename, 'r') as f:
            statements=json.load(f)
        return cls(statements)
            
    @classmethod
    def generate_from_files(data_file_path, sheet_name, yaml_file_path, wikifier_filepath):
        item_table=ItemTable()
        item_table.update_table_from_wikifier_file(wikifier_filepath, data_file_path, sheet_name)
        yf=CellMapper(yaml_file_path)
        sheet=Sheet(data_file_path, sheet_name)
        statements, errors = get_all_template_statements(yf, sheet, item_table)
        return cls(statements, errors)

    def save_json(self, output_filename):
        download_data=get_file_output_from_statements(self.statements, "json")
        with open(output_filename, 'w') as f:
            f.write(download_data)

    def save_kgtk(self, output_filename, project_name, data_filepath, sheet_name):
        download_data=get_file_output_from_statements(self.statements, "tsv")
        with open(output_filename, 'w') as f:
            f.write(download_data)

    def save_ttl(self, filename):
        download_data=get_file_output_from_statements(self.statements, "ttl")
        with open(output_filename, 'w') as f:
            f.write(download_data)


def add_properties(filepath):
    return add_properties_from_file(filepath)


if __name__ == "__main__":
    import os
    add_properties_from_file(r"D:\UserData\devora\Sources\pedro\various files\property_type_map.json")

    source_folder=r"D:\UserData\devora\Sources\pedro\t2wml\t2wml-api\unit_tests\ground_truth\error-catching"
    data_filepath=os.path.join(source_folder, "input_1.csv")
    sheet_name="input_1.csv"
    yaml_filepath=os.path.join(source_folder, "error.yaml")
    wikifier_filepath=os.path.join(source_folder, "wikifier_1.csv")
    output_filename=r"D:\UserData\devora\Sources\pedro\temp\test_api_script_results.tsv"
    
    kg=KnowledgeGraph.generate_from_files(data_filepath, sheet_name, yaml_filepath, wikifier_filepath)
    kg.save_kgtk(output_filename, "Project", data_filepath, sheet_name)
