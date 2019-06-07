class CellOperatorArgument:
    def __init__(self) -> None:
        self.value = None
    
    def evaluate(self, bindings: dict) -> str:
        """
        This function checks if the operator argument exists in the binding dictionary. If yes then
        it returns the value from bindings else it returns the argument as is.
        :param bindings:
        :return: cell operator argument of type str
        """
        return bindings.get(self.value, self.value)
