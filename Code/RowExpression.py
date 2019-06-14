from utility_functions import get_excel_row_index


class RowExpression:
    def __init__(self) -> None:
        self.row_variable = None
        self.operations = []
    
    def evaluate(self, bindings: dict) -> int:
        """
        This function evaluates the row variable and find its respective index in the excel file.
        Then perform add or subtract operations to find the required row index
        based on the cell operator and cell operator argument
        :param bindings:
        :return: row variable of type int
        """
        rv = self.row_variable.evaluate(bindings)
        # rv = get_excel_row_index(rv)
        for i in self.operations:
            if i['cell_operator'] == '+':
                rv = rv+int(i['cell_operator_argument'].evaluate(bindings))
            elif i['cell_operator'] == '-':
                rv = rv-int(i['cell_operator_argument'].evaluate(bindings))
        if rv < 0:
            raise ValueError('Row value out of bound')
        return rv
