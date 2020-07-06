import json
from t2wml.wikification.item_table import ItemTable
from t2wml.wikification.utility_functions import add_properties_from_file
from t2wml.mapping.cell_mapper import get_region_and_template
from t2wml.mapping.t2wml_handling import get_all_template_statements, get_file_output_from_statements
from t2wml.mapping.triple_generator import generate_triples
from t2wml.utils.t2wml_exceptions import FileTypeNotSupportedException
from t2wml.settings import t2wml_settings

def set_wikidata_provider(wp):
    t2wml_settings["wikidata_provider"]=wp

def set_sparql_endpoint(se):
    t2wml_settings["sparql_endpoint"]=se


class KnowledgeGraph:
    def __init__(self, statements, errors=[], project_name=""):
        self.statements=statements
        self.errors=errors
        self.project_name=project_name

    @classmethod
    def load_json(cls, filename):
        pass
    
    @classmethod
    def generate_from_files(data_file_path, sheet_name, yaml_file_path, wikifier_filepath):
        item_table=ItemTable()
        item_table.update_table_from_wikifier_file(wikifier_filepath, data_file_path, sheet_name)
        region, template = get_region_and_template(yaml_file_path, item_table, data_file_path, sheet_name, use_cache=False)
        statements, errors = get_all_template_statements(region, template)
        return cls(statements, errors)

    def save_json(self, output_filename, project_name, data_filepath, sheet_name):
        download_data=get_file_output_from_statements(self.statements, "json")
        with open(output_filename, 'w') as f:
            f.write(download_data)
    def save_kgtk(self, filename):
        pass
    def save_ttl(self, filename):
        pass



def save_file(data_filepath, sheet_name, yaml_filepath, wikifier_filepath,
                        output_filename, output_format, project_name=""):
    statements, errors = get_template_statements(data_filepath, sheet_name, yaml_filepath, wikifier_filepath)
    download_data=get_file_output_from_statements(statements, filetype, project_name, data_filepath, sheet_name)
    with open(output_filename, 'w') as f:
        f.write(download_data)

def add_properties(filepath):
    return add_properties_from_file(filepath)


if __name__ == "__main__":
    import os
    source_folder=r"D:\UserData\devora\Sources\pedro\t2wml\t2wml-api\unit_tests\ground_truth\error-catching"
    data_filepath=os.path.join(source_folder, "input_1.csv")
    sheet_name="input_1.csv"
    yaml_filepath=os.path.join(source_folder, "error.yaml")
    wikifier_filepath=os.path.join(source_folder, "wikifier_1.csv")
    output_filename=r"D:\UserData\devora\Sources\pedro\temp\test_api_script_results.tsv"
    add_properties_from_file(r"D:\UserData\devora\Sources\pedro\various files\property_type_map.json")
    get_download(data_filepath, sheet_name, yaml_filepath, wikifier_filepath,
                        output_filename, "tsv", project_name="")



