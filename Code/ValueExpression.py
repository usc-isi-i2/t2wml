import pyexcel as pe
import os

__CWD__=os.getcwd()

class ValueExpression:
    def __init__(self):
        self.cell_expression=None
        
    def evaluate(self,bindings):
        ce,re=self.cell_expression.evaluate(bindings)
        records = pe.get_book(file_name=__CWD__+"\\Datasets\\homicide_report_total_and_sex.xlsx")
        sheet=records["table-1a"]
        print("Workbook:",__CWD__,"\\Datasets\\homicide_report_total_and_sex.xlsx")
        print("Worksheet: table-1a")
        print("Row:",re,"Col:",ce)
        return sheet[re,ce]