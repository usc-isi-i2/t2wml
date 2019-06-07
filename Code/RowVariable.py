class RowVariable:
    def __init__(self) -> None:
        self.value = None

    def evaluate(self, bindings: dict) -> str:
        """
        This function checks if the row variable exists in the bindings dictionary
        If yes, then returns the value from the dictionary else it returns the row variable as is.
        :param bindings:
        :return: row variable of type str
        """
        return bindings.get(self.value, self.value)
