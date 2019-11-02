from Code.utility_functions import get_excel_row_index


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
        try:
            value = bindings[self.value]
            if value is not None:
                return value
        except KeyError:
            return get_excel_row_index(self.value)

    def check_for_top(self) -> bool:
        """
        this function checks if $top is present as a column variable at any leaf
        :return:
        """
        if self.value and self.value == "$top":
            return True
        else:
            return False

    def check_for_bottom(self) -> bool:
        """
        this function checks if $bottom is present as a column variable at any leaf
        :return:
        """
        if self.value and self.value == "$bottom":
            return True
        else:
            return False
