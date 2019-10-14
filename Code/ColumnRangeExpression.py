class ColumnRangeExpression:
    def __init__(self) -> None:
        self.from_column_variable = None
        self.to_column_variable = None

    def evaluate(self, bindings: dict) -> tuple:
        """
        This function evaluates the from and to column variable and find its respective index in the excel file.
        :param bindings:
        :return: column index of type int
        """
        fcv = self.from_column_variable.evaluate(bindings)
        tcv = self.to_column_variable.evaluate(bindings)
        return fcv, tcv
