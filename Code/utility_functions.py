from typing import Union


def get_excel_column_index(column: str) -> int:
    """
    This function converts an excel column to its respective column index as used by pyexcel package.
    viz. 'A' to 0
    'AZ' to 51
    :param column:
    :return: column index of type int
    """
    index = 0
    column = column.upper()
    column = column[::-1]
    for i in range(len(column)):
        index += ((ord(column[i]) % 65 + 1)*(26**i))
    return index-1


def get_excel_row_index(row: Union[str, int]) -> int:
    """
    This function converts an excel row to its respective row index as used by pyexcel package.
    viz. '5' to 1
    10 to 9
    :param row:
    :return: row index of type int
    """
    return int(row)-1
