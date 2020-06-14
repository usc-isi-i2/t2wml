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

from driver import run_t2wml
repo_folder=Path(__file__).parents[2]
unit_test_folder=os.path.join(repo_folder, "backend", "unit_tests", "ground_truth")
class TestDriver(unittest.TestCase):
    maxDiff = None
    def setUp(self):
        self.data_file=os.path.join(unit_test_folder, "belgium-regex", "Belgium.csv")
        self.wikifier_file=os.path.join(unit_test_folder, "belgium-regex", "wikifier.csv")
        self.yaml_file=os.path.join(unit_test_folder, "belgium-regex", "Belgium.yaml")
        self.sparql_endpoint = 'https://dsbox02.isi.edu:8888/bigdata/namespace/wdq/sparql'
        self.expected_result_dir=os.path.join(unit_test_folder, "belgium-regex")

    def test_driver(self):
        sheet_name="Belgium.csv"
        result=run_t2wml(self.data_file, self.wikifier_file, self.yaml_file, self.expected_result_dir, sheet_name, self.sparql_endpoint, "tsv", "TestKGTK")
        expected_result_name="results.tsv"

        csv_args_dict=dict(delimiter="\t", lineterminator="\n",
                            escapechar='', quotechar='',
                            dialect=csv.unix_dialect, quoting=csv.QUOTE_NONE)
        with open(os.path.join(self.expected_result_dir, expected_result_name), 'r') as f1, open(os.path.join(self.expected_result_dir, "Belgium", "results.tsv")) as f2:
            expected_reader=csv.reader(f1, **csv_args_dict)
            result_reader=csv.reader(f2, **csv_args_dict)
        
            for e_line, r_line in zip(expected_reader, result_reader):
                self.assertEqual(e_line, r_line)



if __name__ == '__main__':
    unittest.main()

