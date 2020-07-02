import json
from t2wml.wikification.item_table import ItemTable
from t2wml.mapping.cell_mapper import CellMapper
from t2wml.mapping.t2wml_handling import get_all_template_statements, get_file_output_from_data
from t2wml.mapping.triple_generator import generate_triples
from t2wml.wikification.wikidata_provider import DictionaryFileProvider
from t2wml.settings import t2wml_settings
from t2wml.utils.t2wml_exceptions import FileTypeNotSupportedException

def get_template_statements(data_file_path, sheet_name, yaml_file_path, wikifier_filepath):
    item_table=ItemTable()
    item_table.update_table_from_wikifier_file(wikifier_filepath, data_file_path, sheet_name)
    cell_mapper=CellMapper(yaml_file_path, item_table, data_file_path, sheet_name, use_cache=False)
    data, errors = get_all_template_statements(cell_mapper)
    return data, errors


def save_file(data_filepath, sheet_name, yaml_filepath, wikifier_filepath,
                        output_filename, output_format, project_name=""):
    data, errors = get_template_statements(data_filepath, sheet_name, yaml_filepath, wikifier_filepath)
    download_data=get_file_output_from_data(data, filetype, project_name, data_filepath, sheet_name)
    with open(output_filename, 'w') as f:
        f.write(download_data)

def add_properties(filepath):
    dp=DictionaryFileProvider(filepath, t2wml_settings["sparql_endpoint"])
    t2wml_settings["wikidata_provider"]=dp
    

