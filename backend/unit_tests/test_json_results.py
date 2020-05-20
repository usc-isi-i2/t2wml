import os
import json
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

from backend_code.wikify_handling import process_wikified_output_file
from backend_code.item_table import ItemTable
from backend_code.cell_mapper import CellMapper
from backend_code.t2wml_handling import generate_download_file


repo_folder=Path(__file__).parents[2]
dataset_folder=os.path.join(repo_folder, "Datasets")






class TestHomicideData(unittest.TestCase):
    maxDiff = None
    def setUp(self):
        self.data_file=os.path.join(dataset_folder, "homicide", "homicide_report_total_and_sex.xlsx")
        self.wikifier_file=os.path.join(dataset_folder, "wikifier_general.csv")
        self.sparql_endpoint = 'https://dsbox02.isi.edu:8888/bigdata/namespace/wdq/sparql'
        self.expected_result_dir=os.path.join(repo_folder, "backend", "unit_tests", "ground_truth", "homicide_results")
        self.yaml_folder=os.path.join(dataset_folder, "homicide", "t2mwl")
    
    def validate_results(self, results, expected):
        #for now this compares cell by cell. 
        #we could eventually have this compare more granularly, if we see there's specific properties we need to ignore
        #or we could pop those properties out before the comparison and deal with them separately
        for i in range(len(results)):
            r_dict=results[i]
            e_dict=expected[i]
            self.assertEqual(e_dict, r_dict)

    def run_test_on_sheet(self, sheet_name):
        yaml_name= sheet_name+".yaml"
        expected_result_name=sheet_name+".json"
        yaml_file=os.path.join(self.yaml_folder, yaml_name)
        with open(os.path.join(self.expected_result_dir, expected_result_name), 'r') as f:
            expected_result=json.load(f)

        item_table=ItemTable()
        process_wikified_output_file(self.wikifier_file, item_table, self.data_file, sheet_name)
        cm=CellMapper(yaml_file, item_table, self.data_file, sheet_name, self.sparql_endpoint)
        result=generate_download_file(cm, "json")
        result_dict=json.loads(result['data'])

        self.validate_results(result_dict, expected_result)

    def test_sheet_1a(self):
        sheet_name="table-1a"
        self.run_test_on_sheet(sheet_name)

    def test_sheet_1b(self):
        sheet_name="table-1b"
        self.run_test_on_sheet(sheet_name)

    def test_sheet_2a(self):
        sheet_name="table-2a"
        self.run_test_on_sheet(sheet_name)
    
    def test_sheet_2b(self):
        sheet_name="table-2b"
        self.run_test_on_sheet(sheet_name)
    
    def test_sheet_10d(self):
        sheet_name="table-10d"
        self.run_test_on_sheet(sheet_name)

    


if __name__ == '__main__':
    unittest.main()

