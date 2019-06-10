from typing import Union


class ValueExpression:
    def __init__(self) -> None:
        self.cell_expression = None
        self.boolean_equation = None

    def evaluate(self, bindings: dict) -> Union[str, int]:
        """
        This function calls evaluate function of its respective not null members
        and then finds the value of the respective column and row in the excel file
        :param bindings:
        :return: value of a cell in the excel file
        """
        if self.cell_expression:
            ce, re = self.cell_expression.evaluate(bindings)
        else:
            cell_expression = self.boolean_equation.evaluate(bindings)
            if cell_expression:
                ce = cell_expression[0]
                re = cell_expression[1]
            else:
                raise ValueError("Invalid Row and Column values")
        return bindings['excel_sheet'][re, ce]
