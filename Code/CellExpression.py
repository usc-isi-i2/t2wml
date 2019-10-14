from typing import Sequence


class CellExpression:
    def __init__(self) -> None:
        self.column_expression = None
        self.row_expression = None
        self.column_range_expression = None
        self.row_range_expression = None

    def evaluate(self, bindings: dict) -> Sequence[int]:
        """
        This function evaluates the row and column expressions and returns the respective row and column indices

        :param bindings:
        :return: column and row indices of type int
        """
        if self.row_expression:
            re = self.row_expression.evaluate(bindings)
        else:
            re = self.row_range_expression.evaluate(bindings)

        if self.column_expression:
            ce = self.column_expression.evaluate(bindings)
        else:
            ce = self.column_range_expression.evaluate(bindings)

        return ce, re
