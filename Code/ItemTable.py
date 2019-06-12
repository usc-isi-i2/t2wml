from typing import Union
import csv


class ItemTable:
	def __init__(self):
		self.cell_to_qnode = {}
		self.value_to_qnode = {}

	def generate_hash_tables(self, file_path: str, header: bool = True) -> None:
		"""
		This function maps the cell (column, row) value of that cell to the qnode found at that cell by the wikifier
		:param file_path:
		:param header:
		:return: None
		"""
		with open(file_path) as file:
			csv_reader = csv.reader(file, delimiter=',')
			for row in csv_reader:
				if header:
					header = False
					continue
				if row[0] is not None and row[1] is not None:
					self.cell_to_qnode[(row[0], row[1])] = row[3]
				if row[2] is not None:
					self.value_to_qnode[row[2]] = row[3]

	def get_item(self, column: int, row: int, value: Union[str, int]) -> Union[str, Exception]:
		"""
		This function searches return the qnode of the value found at (column, row) cell.
		The catch here is that cell_to_qnode hash table is given preference over value_to_qnode dictionary.
		:param column:
		:param row:
		:param value:
		:return: qnode or exception
		"""
		if self.cell_to_qnode.get((column, row), None):
			return self.cell_to_qnode[(column, row)]
		elif self.value_to_qnode.get(value, None):
			return self.value_to_qnode[value]
		else:
			raise Exception('No QNode Exists for this cell value')

