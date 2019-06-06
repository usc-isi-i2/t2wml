from utility_functions import get_excel_row_index
class RowExpression:
    def __init__(self):
        self.row_variable=None
        self.operations=[]
    
    def evaluate(self,bindings):
        rv=self.row_variable.evaluate(bindings)
        rv=get_excel_row_index(rv)
        for i in self.operations:
            if i['cell_operator'] == '+':
                rv=rv+int(i['cell_operator_argument'].evaluate(bindings))
            elif i['cell_operator'] == '-':
                rv=rv-int(i['cell_operator_argument'].evaluate(bindings))
        if rv<0:
            raise ValueError('Column value out of bound')
        return rv