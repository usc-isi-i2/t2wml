from Code.T2WMLException import T2WMLException


class ColumnExpression:
    def __init__(self) -> None:
        self.column_variable = None
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
        This function evaluates the column variable and find its respective index in the excel file.
        Then perform add or subtract operations to find the required column index
        based on the cell operator and cell operator argument
        :param bindings:
        :return: column index of type int
        """
        cv = self.column_variable.evaluate(bindings)

        if not isinstance(cv, int):
            raise Exception("T2WMLException.ValueErrorInYAMLFile", T2WMLException.ValueErrorInYAMLFile.value, "Invalid column value found. Column_value = "+ str(cv))

        for i in self.operations:
            if i['cell_operator'] == '+':
                cv = cv+int(i['cell_operator_argument'].evaluate(bindings))
            elif i['cell_operator'] == '-':
                cv = cv-int(i['cell_operator_argument'].evaluate(bindings))

        if cv < -1:
            raise Exception("T2WMLException.ValueOutOfBound", T2WMLException.ValueOutOfBound.value, "Column value is outside the bounds of the data file")
        return cv

    def check_for_left(self) -> bool:
        """
        this function checks if $left is present as a column variable at any leaf
        :return:
        """
        if self.column_variable:
            return self.column_variable.check_for_left()
        else:
            return False

    def check_for_right(self) -> bool:
        """
        this function checks if $right is present as a column variable at any leaf
        :return:
        """
        if self.column_variable:
            return self.column_variable.check_for_right()
        else:
            return False

