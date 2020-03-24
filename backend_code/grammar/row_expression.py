from backend_code import t2wml_exceptions as T2WMLExceptions


class RowExpression:
    def __init__(self) -> None:
        self.row_variable = None
        self.operations = []

    def get_variable_cell_operator_arguments(self):
        variables = set()
        if self.operations:
            for i in self.operations:
                if str(i['cell_operator_argument'].value).isalpha():
                    variables.add(i['cell_operator_argument'].value)
        return variables

    def evaluate(self, bindings: dict) -> int:
        """
        This function evaluates the row variable and find its respective index in the excel file.
        Then perform add or subtract operations to find the required row index
        based on the cell operator and cell operator argument
        :param bindings:
        :return: row variable of type int
        """
        rv = self.row_variable.evaluate(bindings)
        if not isinstance(rv, int):
            raise T2WMLExceptions.ValueErrorInYAMLFileException( "Invalid row value found. Row_value = "+ str(rv))

        for i in self.operations:
            if i['cell_operator'] == '+':
                rv = rv+int(i['cell_operator_argument'].evaluate(bindings))
            elif i['cell_operator'] == '-':
                rv = rv-int(i['cell_operator_argument'].evaluate(bindings))
        if rv < -1:
            raise T2WMLExceptions.ValueOutOfBoundException("Row value is outside the bounds of the data file")
        return rv

    def check_for_top(self) -> bool:
        """
        this function checks if $top is present as a column variable at any leaf
        :return:
        """
        if self.row_variable:
            return self.row_variable.check_for_top()
        else:
            return False

    def check_for_bottom(self) -> bool:
        """
        this function checks if $bottom is present as a column variable at any leaf
        :return:
        """
        if self.row_variable:
            return self.row_variable.check_for_bottom()
        else:
            return False

