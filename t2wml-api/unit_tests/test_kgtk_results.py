import os
from io import StringIO
import csv
import unittest
from pathlib import Path
try:
    from backend_code import models
except:
    import sys, inspect
    currentdir = os.path.dirname(os.path.abspath(inspect.getfile(inspect.currentframe())))
    grandparent_dir = os.path.dirname(os.path.dirname(currentdir))
    sys.path.insert(0, grandparent_dir)
    sys.path.insert(1, os.path.join(sys.path[0], '...'))


from backend_code.item_table import ItemTable
from backend_code.cell_mapper import CellMapper
from backend_code.t2wml_handling import download_kgtk
from backend_code.utility_functions import add_properties_from_file

repo_folder=Path(__file__).parents[2]
unit_test_folder=os.path.join(repo_folder, "backend", "unit_tests", "ground_truth")


class TestBelgiumRegex(unittest.TestCase):
    maxDiff = None
    def setUp(self):
        self.data_file=os.path.join(unit_test_folder, "belgium-regex", "Belgium.csv")
        self.wikifier_file=os.path.join(unit_test_folder, "belgium-regex", "wikifier.csv")
        self.yaml_file=os.path.join(unit_test_folder, "belgium-regex", "Belgium.yaml")
        self.sparql_endpoint = 'https://dsbox02.isi.edu:8888/bigdata/namespace/wdq/sparql'
        self.expected_result_dir=os.path.join(unit_test_folder, "belgium-regex")
        

    def test_regex(self):
        yaml_file=self.yaml_file
        item_table=ItemTable()
        sheet_name="Belgium.csv"
        item_table.update_table_from_wikifier_file(self.wikifier_file, self.data_file, sheet_name)
        cm=CellMapper(yaml_file, item_table, self.data_file, sheet_name, self.sparql_endpoint)
        result= download_kgtk(cm, "TestKGTK", self.data_file, sheet_name)["data"]
        expected_result_name="results.tsv"
        #with open(os.path.join(self.expected_result_dir, expected_result_name), 'w') as f:
        #    f.write(result)
        csv_args_dict=dict(delimiter="\t", lineterminator="\n",
                            escapechar='', quotechar='',
                            dialect=csv.unix_dialect, quoting=csv.QUOTE_NONE)
        with open(os.path.join(self.expected_result_dir, expected_result_name), 'r') as f:
            expected_reader=csv.reader(f, **csv_args_dict)
            fake_result_file=StringIO(result)
            result_reader=csv.reader(fake_result_file, **csv_args_dict)
            for e_line, r_line in zip(expected_reader, result_reader):
                self.assertEqual(e_line, r_line)


class TestOECDWithCustomProperties(unittest.TestCase):
    maxDiff = None
    def setUp(self):
        self.data_file=os.path.join(unit_test_folder, "custom_properties", "oecd.csv")
        self.wikifier_file=os.path.join(unit_test_folder, "custom_properties", "properties_wikifier.csv")
        self.yaml_file=os.path.join(unit_test_folder, "custom_properties", "oecd.yaml")
        self.custom_properties_file=os.path.join(unit_test_folder, "custom_properties", "kgtk_properties.tsv")
        self.sparql_endpoint = 'https://dsbox02.isi.edu:8888/bigdata/namespace/wdq/sparql'
        self.expected_result_dir=os.path.join(unit_test_folder, "custom_properties")
        

    def test_custom_properties(self):
        yaml_file=self.yaml_file
        item_table=ItemTable()
        sheet_name="oecd.csv"
        add_props = add_properties_from_file(self.custom_properties_file)
        assert len(add_props["failed"])==0
        item_table.update_table_from_wikifier_file(self.wikifier_file, self.data_file, sheet_name)
        cm=CellMapper(yaml_file, item_table, self.data_file, sheet_name, self.sparql_endpoint)
        result= download_kgtk(cm, "TestKGTK", self.data_file, sheet_name)["data"]
        expected_result_name="results.tsv"
        csv_args_dict=dict(delimiter="\t", lineterminator="\n",
                            escapechar='', quotechar='',
                            dialect=csv.unix_dialect, quoting=csv.QUOTE_NONE)
        with open(os.path.join(self.expected_result_dir, expected_result_name), 'r') as f:
            expected_reader=csv.reader(f, **csv_args_dict)
            fake_result_file=StringIO(result)
            result_reader=csv.reader(fake_result_file, **csv_args_dict)
            for e_line, r_line in zip(expected_reader, result_reader):
                self.assertEqual(e_line, r_line)

if __name__ == '__main__':
    unittest.main()

