from Code.utility_functions import get_excel_column_index


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
        try:
            value = bindings[self.value]
            if value is not None:
                return value
        except KeyError:
            return get_excel_column_index(self.value)
