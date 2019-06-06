class CellExpression:
    def __init__(self):
        self.column_expression=None
        self.row_expression=None

    def evaluate(self,bindings):
        re=self.row_expression.evaluate(bindings)
        ce=self.column_expression.evaluate(bindings)
        return ce,re