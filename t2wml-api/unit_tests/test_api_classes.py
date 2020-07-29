import os
import unittest
from pathlib import Path

repo_folder = Path(__file__).parents[2]
unit_test_folder = os.path.join(
    repo_folder, "t2wml-api", "unit_tests", "ground_truth")


class JsonTest(unittest.TestCase):
    def test_wikifier(self):
        import pandas as pd
        from t2wml.api import Wikifier
        test_folder = os.path.join(unit_test_folder, "error-catching")
        wikifier_file = os.path.join(test_folder, "wikifier_1.csv")
        output_file = os.path.join(test_folder, "test_save_wf")

        wf = Wikifier()
        wf.add_file(wikifier_file)
        df = pd.DataFrame.from_dict({"column": [''], "row": [''],
                                     "value": 'Burundi', "item": ['Q99'], "context": ['']})
        wf.add_dataframe(df)
        wf.save(output_file)
        new_wf = Wikifier.load(output_file)
        item = new_wf.item_table.get_item_by_string('Burundi')
        new_wf.print_data()

    def test_wikifier_service(self):
        from t2wml.api import Wikifier, WikifierService, Sheet
        test_folder = os.path.join(unit_test_folder, "error-catching")
        data_file = os.path.join(test_folder, "input_1.csv")
        region = "A4:C8"
        sheet = Sheet(data_file, "input_1.csv")
        ws = WikifierService()
        df, problem_cells = ws.wikify_region(region, sheet)
        wf = Wikifier()
        wf.add_dataframe(df)
        wf.item_table.get_item(0, 5, sheet=sheet)

    def test_custom_statement_mapper(self):
        from t2wml.mapping.statement_mapper import StatementMapper
        from t2wml.api import KnowledgeGraph, Wikifier, Sheet

        class SimpleSheetMapper(StatementMapper):
            def __init__(self, cols, rows):
                self.cols = cols
                self.rows = rows

            def iterator(self):
                for col in self.cols:
                    for row in self.rows:
                        yield(col, row)

            def get_cell_statement(self, sheet, wikifier, col, row, *args, **kwargs):
                error = {}
                statement = {}
                try:
                    item = wikifier.item_table.get_item(col-1, row)
                    statement["item"] = item
                except Exception as e:
                    error["item"] = str(e)

                try:
                    value = sheet[col, row]
                    statement["value"] = value
                except Exception as e:
                    error["value"] = str(e)

                statement["property"] = "P123"

                return statement, error

        test_folder = os.path.join(unit_test_folder, "custom_classes")
        data_file = os.path.join(test_folder, "Book1.xlsx")
        sheet_name = "Sheet1"
        wikifier_file = os.path.join(test_folder, "wikifier_1.csv")

        ym = SimpleSheetMapper([1, 3], [2, 3, 4, 5, 6, 7])
        sh = Sheet(data_file, sheet_name)
        wf = Wikifier()
        wf.add_file(wikifier_file)
        kg = KnowledgeGraph.generate(ym, sh, wf)

    def test_basic_imports(self):
        from t2wml.api import KnowledgeGraph, YamlMapper, Wikifier, Sheet, SpreadsheetFile
        test_folder = os.path.join(unit_test_folder, "error-catching")
        data_file = os.path.join(test_folder, "input_1.csv")
        yaml_file = os.path.join(test_folder, "error.yaml")
        w_file = os.path.join(test_folder, "wikifier_1.csv")

        sheet = Sheet(data_file, "input_1.csv")
        ym = YamlMapper(yaml_file)
        wf = Wikifier()
        wf.add_file(w_file)
        kg = KnowledgeGraph.generate(ym, sheet, wf)


if __name__ == '__main__':
    unittest.main()
