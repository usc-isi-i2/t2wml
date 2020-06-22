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


from backend_code.item_table import ItemTable
from backend_code.cell_mapper import CellMapper
from backend_code.t2wml_handling import generate_download_file
from backend_code.utility_functions import add_properties_from_file


repo_folder=Path(__file__).parents[2]
dataset_folder=os.path.join(repo_folder, "Datasets")
unit_test_folder=os.path.join(repo_folder, "backend", "unit_tests", "ground_truth")
add_properties_from_file(os.path.join(unit_test_folder, "property_type_map.json"))


class JsonTest(unittest.TestCase):
    def validate_results(self, results, expected):
        #for now this compares cell by cell. 
        #we could eventually have this compare more granularly, if we see there's specific properties we need to ignore
        #or we could pop those properties out before the comparison and deal with them separately
        for cell in results:
            r_dict=results[cell]
            e_dict=expected[cell]
            try:
                self.assertEqual(e_dict, r_dict)
            except:
                for key in e_dict:
                    self.assertEqual(e_dict[key], r_dict[key])


class TestHomicideData(JsonTest):
    maxDiff = None
    def setUp(self):
        self.data_file=os.path.join(dataset_folder, "homicide", "homicide_report_total_and_sex.xlsx")
        self.wikifier_file=os.path.join(dataset_folder, "wikifier_general.csv")
        self.yaml_folder=os.path.join(dataset_folder, "homicide", "t2mwl")
        self.sparql_endpoint = 'https://dsbox02.isi.edu:8888/bigdata/namespace/wdq/sparql'
        self.expected_result_dir=os.path.join(unit_test_folder, "homicide_results")
        add_properties_from_file(os.path.join(unit_test_folder, "property_type_map.json"))
        
    
    def run_test_on_sheet(self, sheet_name):
        yaml_name= sheet_name+".yaml"
        expected_result_name=sheet_name+".json"
        yaml_file=os.path.join(self.yaml_folder, yaml_name)

        item_table=ItemTable()
        item_table.update_table_from_wikifier_file(self.wikifier_file, self.data_file, sheet_name)
        cm=CellMapper(yaml_file, item_table, self.data_file, sheet_name, self.sparql_endpoint)
        result=generate_download_file(cm, "json")
        result_dict=json.loads(result['data'])
        
        #code for saving results in an initial run (insertion-ordered and indented as mercy to future users)
        #with open(os.path.join(self.expected_result_dir, expected_result_name), 'w') as f:
        #    json.dump(result_dict, f, sort_keys=False, indent=4)
        with open(os.path.join(self.expected_result_dir, expected_result_name), 'r') as f:
            expected_result=json.load(f)

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

    def test_sheet_3a(self):
        sheet_name = "table-3a"
        self.run_test_on_sheet(sheet_name)

    def test_sheet_3b(self):
        sheet_name = "table-3b"
        self.run_test_on_sheet(sheet_name)

    def test_sheet_4a(self):
        sheet_name = "table-4a"
        self.run_test_on_sheet(sheet_name)

    def test_sheet_4b(self):
        sheet_name = "table-4b"
        self.run_test_on_sheet(sheet_name)

    def test_sheet_5a(self):
        sheet_name = "table-5a"
        self.run_test_on_sheet(sheet_name)

    def test_sheet_5b(self):
        sheet_name = "table-5b"
        self.run_test_on_sheet(sheet_name)

    def test_sheet_6(self):
        sheet_name = "table-6"
        self.run_test_on_sheet(sheet_name)

    def test_sheet_8(self):
        sheet_name = "table-8"
        self.run_test_on_sheet(sheet_name)

    def test_sheet_9(self):
        sheet_name = "table-9"
        self.run_test_on_sheet(sheet_name)

    def test_sheet_10a(self):
        sheet_name = "table-10a"
        self.run_test_on_sheet(sheet_name)

    def test_sheet_10b(self):
        sheet_name="table-10b"
        self.run_test_on_sheet(sheet_name)

    def test_sheet_10c(self):
        sheet_name="table-10c"
        self.run_test_on_sheet(sheet_name)

    def test_sheet_10d(self):
        sheet_name="table-10d"
        self.run_test_on_sheet(sheet_name)

    def test_sheet_10e(self):
        sheet_name="table-10e"
        self.run_test_on_sheet(sheet_name)

class TestBelgiumRegex(JsonTest):
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
        result=generate_download_file(cm, "json")
        result_dict=json.loads(result['data'])
        expected_result_name="results.json"
        with open(os.path.join(self.expected_result_dir, expected_result_name), 'r') as f:
            expected_result=json.load(f)

        self.validate_results(result_dict, expected_result)


class TestErrorCatching(JsonTest):
    maxDiff = None
    def setUp(self):
        test_folder=os.path.join(unit_test_folder, "error-catching")
        self.data_file=os.path.join(test_folder, "input_1.csv")
        self.wikifier_file=os.path.join(test_folder, "wikifier_1.csv")
        self.yaml_file=os.path.join(test_folder, "error.yaml")
        self.sparql_endpoint = 'https://dsbox02.isi.edu:8888/bigdata/namespace/wdq/sparql'
        self.expected_result_dir=test_folder
        

    def test_error(self):
        yaml_file=self.yaml_file
        item_table=ItemTable()
        sheet_name="input_1.csv"
        item_table.update_table_from_wikifier_file(self.wikifier_file, self.data_file, sheet_name)
        cm=CellMapper(yaml_file, item_table, self.data_file, sheet_name, self.sparql_endpoint)
        result=generate_download_file(cm, "json")
        result_dict= {"data":json.loads(result['data']), "error":result['error']}
        expected_result_name="results.json"
        with open(os.path.join(self.expected_result_dir, expected_result_name), 'r') as f:
            expected_result=json.load(f)

        self.validate_results(result_dict, expected_result)




if __name__ == '__main__':
    unittest.main()

