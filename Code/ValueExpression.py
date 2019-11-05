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
        if self.cell_expression:
            ce, re = self.cell_expression.evaluate(bindings)
            if isinstance(ce, tuple) and isinstance(re, int):
                response = list()
                for i in range(ce[0], ce[1] + 1):
                    response.append(str(bindings['excel_sheet'][re, i]).strip())
            elif isinstance(re, tuple) and isinstance(ce, int):
                response = list()
                for i in range(re[0], re[1] + 1):
                    response.append(str(bindings['excel_sheet'][i, ce]))
            elif isinstance(ce, int) and isinstance(re, int):
                response = str(bindings['excel_sheet'][re, ce]).strip()
        else:
            cell_expression = self.boolean_equation.evaluate(bindings)
            if cell_expression:
                ce = cell_expression[0]
                re = cell_expression[1]
                response = str(bindings['excel_sheet'][re, ce]).strip()
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
                    response.append(str(bindings['excel_sheet'][re, i]).strip())
            elif isinstance(re, tuple) and isinstance(ce, int):
                response = list()
                for i in range(re[0], re[1] + 1):
                    response.append(str(bindings['excel_sheet'][i, ce]))
            elif isinstance(ce, int) and isinstance(re, int):
                response = str(bindings['excel_sheet'][re, ce]).strip()
        else:
            cell_expression = self.boolean_equation.evaluate(bindings)
            if cell_expression:
                ce = cell_expression[0]
                re = cell_expression[1]
                response = str(bindings['excel_sheet'][re, ce]).strip()
            else:
                raise ValueError("Invalid Row and Column values")
        return ce, re, response

    def check_for_left(self) -> bool:
        """
        this function checks if $left is present as a column variable at any leaf
        :return:
        """
        if self.cell_expression:
            return self.cell_expression.check_for_left()
        elif self.boolean_equation:
            return self.boolean_equation.check_for_left()
        else:
            return False

    def check_for_right(self) -> bool:
        """
        this function checks if $right is present as a column variable at any leaf
        :return:
        """
        if self.cell_expression:
            return self.cell_expression.check_for_right()
        elif self.boolean_equation:
            return self.boolean_equation.check_for_right()
        else:
            return False

    def check_for_top(self) -> bool:
        """
        this function checks if $top is present as a column variable at any leaf
        :return:
        """
        if self.cell_expression:
            return self.cell_expression.check_for_top()
        elif self.boolean_equation:
            return self.boolean_equation.check_for_top()
        else:
            return False

    def check_for_bottom(self) -> bool:
        """
        this function checks if $bottom is present as a column variable at any leaf
        :return:
        """
        if self.cell_expression:
            return self.cell_expression.check_for_bottom()
        elif self.boolean_equation:
            return self.boolean_equation.check_for_bottom()
        else:
            return False
