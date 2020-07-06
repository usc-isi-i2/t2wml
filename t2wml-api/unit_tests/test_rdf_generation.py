import os
import shutil
import unittest
from pathlib import Path
import tempfile

from t2wml.wikification.item_table import ItemTable
from t2wml.mapping.cell_mapper import get_region_and_template
from t2wml.mapping.t2wml_handling import get_all_template_statements
from t2wml.mapping.download import get_file_output_from_statements
from t2wml.wikification.utility_functions import add_properties_from_file
from t2wml.spreadsheets.utilities import get_first_sheet_name


output_directory = tempfile.mkdtemp()

_path = Path(__file__).parent

output_directory = os.path.join(_path, "tmp")
os.makedirs(output_directory, exist_ok=True)

def download(region, template):
    statements, errors=get_all_template_statements(region, template)
    output= get_file_output_from_statements(statements, "ttl")
    return output

# output_directory = os.path.join(_path, "tmp")
# os.makedirs(output_directory, exist_ok=True)


class TestRDFGeneration(unittest.TestCase):
    maxDiff = None

    def setUp(self) -> None:
        self.input_file_path_1 = '{}/ground_truth/input_1.csv'.format(_path)
        self.input_file_path_3 = '{}/ground_truth/input_3.csv'.format(_path)
        self.wikifier_path = '{}/ground_truth/wikifier_1.csv'.format(_path)
        self.results_path_1 = '{}/ground_truth/results_1.ttl'.format(_path)
        self.results_path_2 = '{}/ground_truth/results_2.ttl'.format(_path)
        self.results_path_3 = '{}/ground_truth/results_3.ttl'.format(_path)
        self.results_path_4 = '{}/ground_truth/results_4.ttl'.format(_path)
        self.t2wml_spec_path_1 = '{}/ground_truth/t2wml_spec_1.yaml'.format(_path)
        self.t2wml_spec_path_2 = '{}/ground_truth/t2wml_spec_2.yaml'.format(_path)
        self.t2wml_spec_path_3 = '{}/ground_truth/t2wml_spec_3.yaml'.format(_path)
        self.t2wml_spec_path_4 = '{}/ground_truth/t2wml_spec_4.yaml'.format(_path)


    def test_rdf_generation(self, sheet_name: str = None):
        with open(self.results_path_1, 'r') as f:
            results=f.read()
        if not sheet_name:
            sheet_name = get_first_sheet_name(self.input_file_path_1)
        file_path = self.input_file_path_1

        item_table = ItemTable()
        item_table.update_table_from_wikifier_file(self.wikifier_path, file_path, sheet_name)

        region, template = get_region_and_template(self.t2wml_spec_path_1, item_table, file_path, sheet_name)

        response = download(region, template)
        self.assertEqual(response, results)

    def test_rdf_generation_with_units(self, sheet_name: str = None):
        with open(self.results_path_2, 'r') as f:
            results=f.read()
        if not sheet_name:
            sheet_name = get_first_sheet_name(self.input_file_path_1)
        file_path = self.input_file_path_1

        item_table = ItemTable()
        item_table.update_table_from_wikifier_file(self.wikifier_path, file_path, sheet_name)

        r, t = get_region_and_template(self.t2wml_spec_path_2, item_table, file_path, sheet_name)

        response = download(r, t)
        self.assertEqual(response, results)

    def test_rdf_generation_with_geo_coordinates_as_qualifiers(self, sheet_name: str = None):
        with open(self.results_path_3, 'r') as f:
            results=f.read()
        if not sheet_name:
            sheet_name = get_first_sheet_name(self.input_file_path_3)
        
        file_path = self.input_file_path_3

        item_table = ItemTable()
        item_table.update_table_from_wikifier_file(self.wikifier_path, file_path, sheet_name)

        r,t= get_region_and_template(self.t2wml_spec_path_3, item_table, file_path, sheet_name)

        response = download(r, t)
        self.assertEqual(response, results)

    def test_rdf_generation_with_geo_coordinates(self, sheet_name: str = None):
        with open(self.results_path_4, 'r') as f:
            results=f.read()
        if not sheet_name:
            sheet_name = get_first_sheet_name(self.input_file_path_3)
        file_path = self.input_file_path_3

        item_table = ItemTable()
        item_table.update_table_from_wikifier_file(self.wikifier_path, file_path, sheet_name)

        r, t=get_region_and_template(self.t2wml_spec_path_4, item_table, file_path, sheet_name)

        response = download(r, t)
        self.assertEqual(response, results)


if __name__ == '__main__':
    unittest.main()
