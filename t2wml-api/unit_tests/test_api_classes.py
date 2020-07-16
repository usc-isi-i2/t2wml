import os
import unittest
from pathlib import Path
import pandas as pd
from t2wml.wikification.item_table import Wikifier

repo_folder=Path(__file__).parents[2]
unit_test_folder=os.path.join(repo_folder, "t2wml-api", "unit_tests", "ground_truth")

class JsonTest(unittest.TestCase):
    def test_wikifier(self):
        test_folder=os.path.join(unit_test_folder, "error-catching")
        wikifier_file=os.path.join(test_folder, "wikifier_1.csv")
        
        wf = Wikifier()
        
        wf.add_file(wikifier_file)
        df=pd.DataFrame.from_dict({"column":[''], "row":[''], "value":'Burundi', "item":['Q99'], "context":['']})
        wf.add_dataframe(df)
        wf.save(r"D:\UserData\devora\Sources\pedro\temp\test_save_wf")
        new_wf=Wikifier.load(r"D:\UserData\devora\Sources\pedro\temp\test_save_wf")
        item=new_wf.item_table.get_item_by_string('Burundi')
        new_wf.print_data()


if __name__ == '__main__':
    unittest.main()
