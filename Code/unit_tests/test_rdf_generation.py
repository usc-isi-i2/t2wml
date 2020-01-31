from Code.ItemTable import ItemTable
from Code.handler import generate_download_file, load_yaml_data, process_wikified_output_file
from Code.YAMLFile import YAMLFile
from pathlib import Path
from Code.utility_functions import get_first_sheet_name, add_row_in_data_file, delete_file
import unittest

output_directory = '/tmp'


class TestRDFGeneration(unittest.TestCase):

    def setUp(self) -> None:
        self.input_file_path = './ground_truth/input_1.csv'
        self.wikifier_path = './ground_truth/wikifier_1.csv'
        self.t2wml_spec_path_1 = './ground_truth/t2wml_spec_1.yaml'
        self.sparql_endpoint = 'https://dsbox02.isi.edu:8899/bigdata/namespace/wdq/sparql'
        self.results_path_1 = './ground_truth/results_1.ttl'
        self.results_path_2 = './ground_truth/results_2.ttl'
        self.t2wml_spec_path_2 = './ground_truth/t2wml_spec_2.yaml'

    def test_rdf_generation(self, sheet_name: str = None):
        results = open(self.results_path_1).read()
        if not sheet_name:
            sheet_name = get_first_sheet_name(self.input_file_path)
        file_name = Path(self.input_file_path).name

        new_file_path = '{}/{}'.format(output_directory, file_name)
        add_row_in_data_file(self.input_file_path, sheet_name, new_file_path)

        item_table = ItemTable()
        process_wikified_output_file(self.wikifier_path, item_table, new_file_path, sheet_name)

        yaml_configuration = YAMLFile()
        yaml_configuration.set_file_location(self.t2wml_spec_path_1)
        region, template, created_by = load_yaml_data(self.t2wml_spec_path_1, item_table, new_file_path, sheet_name)
        yaml_configuration.set_region(region)
        yaml_configuration.set_template(template)

        filetype = "ttl"

        response = generate_download_file(None, item_table, new_file_path, sheet_name, region, template, filetype,
                                          self.sparql_endpoint, created_by=created_by, debug=True)
        self.assertEqual(response['data'], results)

    def test_rdf_generation_with_units(self, sheet_name: str = None):
        results = open(self.results_path_2).read()
        if not sheet_name:
            sheet_name = get_first_sheet_name(self.input_file_path)
        file_name = Path(self.input_file_path).name

        new_file_path = '{}/{}'.format(output_directory, file_name)
        add_row_in_data_file(self.input_file_path, sheet_name, new_file_path)

        item_table = ItemTable()
        process_wikified_output_file(self.wikifier_path, item_table, new_file_path, sheet_name)

        yaml_configuration = YAMLFile()
        yaml_configuration.set_file_location(self.t2wml_spec_path_2)
        region, template, created_by = load_yaml_data(self.t2wml_spec_path_2, item_table, new_file_path, sheet_name)
        yaml_configuration.set_region(region)
        yaml_configuration.set_template(template)

        filetype = "ttl"

        response = generate_download_file(None, item_table, new_file_path, sheet_name, region, template, filetype,
                                          self.sparql_endpoint, created_by=created_by, debug=True)

        self.assertEqual(response['data'], results)
