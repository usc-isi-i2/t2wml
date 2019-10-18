class RowExpression:
    def __init__(self) -> None:
        self.row_variable = None
        self.operations = []

    def get_variable_cell_operator_arguments(self):
        variables = set()
        if self.operations:
            for i in self.operations:
                if i['cell_operator_argument'].isalpha():
                    variables.add(i['cell_operator_argument'])
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
        # print(bindings)
        for i in self.operations:
            if i['cell_operator'] == '+':
                rv = rv+int(i['cell_operator_argument'].evaluate(bindings))
            elif i['cell_operator'] == '-':
                rv = rv-int(i['cell_operator_argument'].evaluate(bindings))
        if rv < -1:
            raise ValueError('Row value out of bound')
        return rv
