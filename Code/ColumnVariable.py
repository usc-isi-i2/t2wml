class ColumnVariable:
    def __init__(self) -> None:
        self.value = None

    def evaluate(self, bindings: dict) -> str:
        """
        This function checks if the column variable exists in the bindings dictionary
        If yes, then returns the value from the dictionary else it returns the column variable as is.
        :param bindings:
        :return: column variable of type str
        """
        return bindings.get(self.value, self.value)
