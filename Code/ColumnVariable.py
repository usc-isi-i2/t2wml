class ColumnVariable:
    def __init__(self):
        self.value=None

    def evaluate(self,bindings):
        return bindings.get(self.value,self.value)