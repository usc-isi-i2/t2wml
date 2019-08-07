class ColumnExpression:
    def __init__(self) -> None:
        self.column_variable = None
        self.operations = []

    def evaluate(self, bindings: dict) -> int:
        """
        This function evaluates the column variable and find its respective index in the excel file.
        Then perform add or subtract operations to find the required column index
        based on the cell operator and cell operator argument
        :param bindings:
        :return: column index of type int
        """
        cv = self.column_variable.evaluate(bindings)
        for i in self.operations:
            if i['cell_operator'] == '+':
                cv = cv+int(i['cell_operator_argument'].evaluate(bindings))
            elif i['cell_operator'] == '-':
                cv = cv-int(i['cell_operator_argument'].evaluate(bindings))
        if cv < -1:
            raise ValueError('Column value out of bound')
        return cv
