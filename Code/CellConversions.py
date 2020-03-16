import re
from typing import Sequence, Union, Tuple, List, Dict, Any

def get_column_letter(n: int) -> str:
    """
    This function converts the column index to column letter
    1 to A,
    5 to E, etc
    :param n:
    :return:
    """
    string = ""
    while n > 0:
        n, remainder = divmod(n - 1, 26)
        string = chr(65 + remainder) + string
    return string


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
        index += ((ord(column[i]) % 65 + 1) * (26 ** i))
    return index - 1


def get_excel_row_index(row: Union[str, int]) -> int:
    """
    This function converts an excel row to its respective row index as used by pyexcel package.
    viz. '5' to 1
    10 to 9
    :param row:
    :return: row index of type int
    """
    return int(row) - 1


def get_excel_cell_index(cell: str):
    column = re.search('[a-zA-Z]+', cell).group(0)
    row = re.search('[0-9]+', cell).group(0)
    return get_excel_column_index(column), get_excel_row_index(row)


def get_actual_cell_index(cell_index: tuple) -> str:
    """
    This function converts the cell notation used by pyexcel package to the cell notation used by excel
    Eg: (0,5) to A6
    :param cell_index: (col, row)
    :return:
    """
    col = get_column_letter(int(cell_index[0]) + 1)
    row = str(int(cell_index[1]) + 1)
    return col + row

def split_cell(cell: str) -> Sequence[int]:
    """
    This function parses excel cell indices to column and row indices supported by pyexcel
    For eg: A4 to 0, 3
    B5 to 1, 4
    :param cell:
    :return:
    """
    x = re.search("[0-9]+", cell)
    row_span = x.span()
    col = cell[:row_span[0]]
    row = cell[row_span[0]:]
    return get_excel_column_index(col), get_excel_row_index(row)

def parse_cell_range(cell_range: str) -> Tuple[Sequence[int], Sequence[int]]:
    """
    This function parses the cell range and returns the row and column indices supported by pyexcel
    For eg: A4:B5 to (0, 3), (1, 4)
    :param cell_range:
    :return:
    """
    cells = cell_range.split(":")
    start_cell = split_cell(cells[0])
    end_cell = split_cell(cells[1])
    return start_cell, end_cell