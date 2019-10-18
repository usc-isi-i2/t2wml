from typing import Union


class ValueExpression:
    def __init__(self) -> None:
        self.cell_expression = None
        self.boolean_equation = None
        self.variables = None

    def get_variable_cell_operator_arguments(self) -> set:
        if self.cell_expression:
            self.variables = self.cell_expression.get_variable_cell_operator_arguments()
        elif self.boolean_equation:
            self.variables = self.boolean_equation.get_variable_cell_operator_arguments()
        return self.variables

    def evaluate(self, bindings: dict) -> Union[str, int]:
        """
        This function calls evaluate function of its respective not null members
        and then finds the value of the respective column and row in the excel file
        :param bindings:
        :return: value of a cell in the excel file
        """
        response = None
        # print('excel', bindings['excel_sheet'])
        if self.cell_expression:
            ce, re = self.cell_expression.evaluate(bindings)
            print(ce, re)
            if isinstance(ce, tuple) and isinstance(re, int):
                response = list()
                for i in range(ce[0], ce[1] + 1):
                    print(bindings['excel_sheet'][re, i])
                    response.append(str(bindings['excel_sheet'][re, i]))
            elif isinstance(re, tuple) and isinstance(ce, int):
                response = list()
                for i in range(re[0], re[1] + 1):
                    response.append(str(bindings['excel_sheet'][i, ce]))
            elif isinstance(ce, int) and isinstance(re, int):
                response = str(bindings['excel_sheet'][re, ce])
        else:
            cell_expression = self.boolean_equation.evaluate(bindings)
            if cell_expression:
                ce = cell_expression[0]
                re = cell_expression[1]
                response = str(bindings['excel_sheet'][re, ce])
            else:
                raise ValueError("Invalid Row and Column values")
        return response

    def get_cell(self, bindings: dict) -> tuple:
        """
        This function returns the cell index on which this expression evaluates
        :param bindings:
        :return:
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
        return ce, re

    def evaluate_and_get_cell(self, bindings: dict) -> tuple:
        """
        This function evaluates the Value expression and returns the result along with the cell index
        :param bindings:
        :return:
        """
        response = None
        if self.cell_expression:
            ce, re = self.cell_expression.evaluate(bindings)
            if isinstance(ce, tuple) and isinstance(re, int):
                response = list()
                for i in range(ce[0], ce[1] + 1):
                    response.append(str(bindings['excel_sheet'][re, i]))
            elif isinstance(re, tuple) and isinstance(ce, int):
                response = list()
                for i in range(re[0], re[1] + 1):
                    response.append(str(bindings['excel_sheet'][i, ce]))
            elif isinstance(ce, int) and isinstance(re, int):
                response = str(bindings['excel_sheet'][re, ce])
        else:
            cell_expression = self.boolean_equation.evaluate(bindings)
            if cell_expression:
                ce = cell_expression[0]
                re = cell_expression[1]
                response = str(bindings['excel_sheet'][re, ce])
            else:
                raise ValueError("Invalid Row and Column values")
        return ce, re, response
