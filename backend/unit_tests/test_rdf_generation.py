import os
import shutil
import unittest
from pathlib import Path
import tempfile

try:
    from backend_code import models
except:
    import sys, inspect
    currentdir = os.path.dirname(os.path.abspath(inspect.getfile(inspect.currentframe())))
    grandparent_dir = os.path.dirname(os.path.dirname(currentdir))
    sys.path.insert(0, grandparent_dir)
    sys.path.insert(1, os.path.join(sys.path[0], '...'))

from backend_code.item_table import ItemTable
from backend_code.t2wml_handling import generate_download_file
from backend_code.spreadsheets.utilities import get_first_sheet_name
from backend_code.cell_mapper import CellMapper
from driver import run_t2wml


output_directory = tempfile.mkdtemp()

_path = Path(__file__).parent

output_directory = os.path.join(_path, "tmp")
os.makedirs(output_directory, exist_ok=True)



# output_directory = os.path.join(_path, "tmp")
# os.makedirs(output_directory, exist_ok=True)


class TestRDFGeneration(unittest.TestCase):
    maxDiff = None

    def setUp(self) -> None:
        self.input_file_path_1 = '{}/ground_truth/input_1.csv'.format(_path)
        self.input_file_path_3 = '{}/ground_truth/input_3.csv'.format(_path)
        self.wikifier_path = '{}/ground_truth/wikifier_1.csv'.format(_path)
        # self.sparql_endpoint = 'https://dsbox02.isi.edu:8899/bigdata/namespace/wdq/sparql'
        self.sparql_endpoint = 'https://query.wikidata.org/bigdata/namespace/wdq/sparql'
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

        yc = CellMapper(self.t2wml_spec_path_1, item_table, file_path, sheet_name, self.sparql_endpoint)

        filetype = "ttl"

        response = generate_download_file(yc, filetype)
        self.assertEqual(response['data'], results)

    def test_rdf_generation_with_units(self, sheet_name: str = None):
        with open(self.results_path_2, 'r') as f:
            results=f.read()
        if not sheet_name:
            sheet_name = get_first_sheet_name(self.input_file_path_1)
        file_path = self.input_file_path_1

        item_table = ItemTable()
        item_table.update_table_from_wikifier_file(self.wikifier_path, file_path, sheet_name)

        yc = CellMapper(self.t2wml_spec_path_2, item_table, file_path, sheet_name, self.sparql_endpoint)


        filetype = "ttl"

        response = generate_download_file(yc, filetype)

        self.assertEqual(response['data'], results)

    def test_rdf_generation_with_geo_coordinates_as_qualifiers(self, sheet_name: str = None):
        with open(self.results_path_3, 'r') as f:
            results=f.read()
        if not sheet_name:
            sheet_name = get_first_sheet_name(self.input_file_path_3)
        
        file_path = self.input_file_path_3

        item_table = ItemTable()
        item_table.update_table_from_wikifier_file(self.wikifier_path, file_path, sheet_name)

        yc= CellMapper(self.t2wml_spec_path_3, item_table, file_path, sheet_name, self.sparql_endpoint)

        filetype = "ttl"

        response = generate_download_file(yc, filetype)

        self.assertEqual(response['data'], results)

    def test_rdf_generation_with_geo_coordinates(self, sheet_name: str = None):
        with open(self.results_path_4, 'r') as f:
            results=f.read()
        if not sheet_name:
            sheet_name = get_first_sheet_name(self.input_file_path_3)
        file_path = self.input_file_path_3

        item_table = ItemTable()
        item_table.update_table_from_wikifier_file(self.wikifier_path, file_path, sheet_name)

        yc = CellMapper(self.t2wml_spec_path_4, item_table, file_path, sheet_name, self.sparql_endpoint)

        filetype = "ttl"

        response = generate_download_file(yc, filetype)


if __name__ == '__main__':
    unittest.main()
