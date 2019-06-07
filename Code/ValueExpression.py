import os
from typing import Union

__CWD__ = os.getcwd()


class ValueExpression:
    def __init__(self) -> None:
        self.cell_expression = None
        
    def evaluate(self, bindings: dict) -> Union[str, int]:
        """
        This function calls evaluate function of its respective not null members
        and then finds the value of the respective column and row in the excel file
        :param bindings:
        :return: value of a cell in the excel file
        """
        ce, re = self.cell_expression.evaluate(bindings)
        print("Workbook:", __CWD__, "\\Datasets\\homicide_report_total_and_sex.xlsx")
        print("Worksheet: table-1a")
        print("Row:", re, "Col:", ce)
        return bindings['excel_sheet'][re, ce]
