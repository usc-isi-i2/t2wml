from typing import Union
import csv
import pyexcel
from Code.utility_functions import get_actual_cell_index, check_if_empty


class ItemTable:
	def __init__(self):
		self.region_items = dict()
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
				if not check_if_empty(row[0]) and not check_if_empty(row[1]):
					self.cell_to_qnode[(int(row[0]), int(row[1]))] = row[3]
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
			raise Exception('No QNode Exists for the cell: ', get_actual_cell_index((column, row)))

	def populate_cell_to_qnode_using_cell_values(self, excel_filepath: str, sheet_name: str = None):
		"""
		This function populates the cell_to_qnode dictionary using the value_to_qnode dictionary and the data file
		:param excel_filepath:
		:param sheet_name:
		:return:
		"""
		records = pyexcel.get_book(file_name=excel_filepath)
		if not sheet_name:
			sheet = records[0]
		else:
			sheet = records[sheet_name]

		for cell, qnode in self.cell_to_qnode.items():
			cell_value = sheet[cell[1], cell[0]]
			if cell_value not in self.value_to_qnode:
				self.value_to_qnode[cell_value] = qnode

		for row in range(len(sheet)):
			for col in range(len(sheet[0])):
				if self.value_to_qnode.get(sheet[row, col], None):
					self.cell_to_qnode[(col, row)] = self.value_to_qnode[sheet[row, col]]

	def serialize_cell_to_qnode(self):
		"""
		This function serializes the cell_to_qnode dictionary
		:return:
		"""
		serialized_dict = dict()
		for cell, value in self.cell_to_qnode.items():
			cell = get_actual_cell_index(cell)
			serialized_dict[cell] = value
		return serialized_dict

	def add_other_region(self):
		self.region_items['Other'] = self.serialize_cell_to_qnode()

	def check_other_for_common_cells(self, region):
		if 'Other' in self.region_items:
			for key in self.region_items[region].keys():
				if key in self.region_items['Other']:
					del self.region_items['Other'][key]

	def add_region(self, region, cell_qnode_map):
		if region not in self.region_items:
			self.region_items[region] = dict()
		self.region_items[region] = cell_qnode_map

	def check_all_regions_for_common_cells_with_other(self):
		for region in self.region_items.keys():
			if region != 'Other':
				self.check_other_for_common_cells(region)
