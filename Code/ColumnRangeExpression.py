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

    def check_for_left(self) -> bool:
        """
        this function checks if $left is present as a column variable at any leaf
        :return:
        """
        has_left = False
        if self.from_column_variable:
            has_left = self.from_column_variable.check_for_left()
        if self.to_column_variable:
            has_left = has_left or self.to_column_variable.check_for_left()
        return has_left

    def check_for_right(self) -> bool:
        """
        this function checks if $right is present as a column variable at any leaf
        :return:
        """
        has_right = False
        if self.from_column_variable:
            has_right = self.from_column_variable.check_for_right()
        if self.to_column_variable:
            has_right = has_right or self.to_column_variable.check_for_right()
        return has_right
