from typing import Union
import csv
import pyexcel
from Code.utility_functions import get_actual_cell_index, check_if_empty, natural_sort_key


class ItemTable:
	def __init__(self):
		self.cell_to_qnode = {}
		self.value_to_qnode = {}
		self.region_qnodes = {'regions': dict(), 'qnodes': dict()}

	def generate_hash_tables(self, file_path: str, excel_filepath: str, sheet_name: str = None, header: bool = True) -> None:
		cell_to_qnode = dict()
		value_to_qnode = dict()
		with open(file_path) as file:
			csv_reader = csv.reader(file, delimiter=',')
			for row in csv_reader:
				if header:
					header = False
					continue
				if not check_if_empty(row[0]) and not check_if_empty(row[1]):
					cell_to_qnode[(int(row[0]), int(row[1]))] = row[3]
				if row[2] is not None:
					value_to_qnode[row[2]] = row[3]

		sheet = pyexcel.get_sheet(sheet_name=sheet_name, file_name=excel_filepath)
		for cell, qnode in cell_to_qnode.items():
			cell_value = sheet[cell[1], cell[0]]
			if cell_value not in value_to_qnode:
				value_to_qnode[cell_value] = qnode

		for row in range(len(sheet)):
			for col in range(len(sheet[0])):
				if value_to_qnode.get(sheet[row, col], None):
					cell_to_qnode[(col, row)] = value_to_qnode[sheet[row, col]]
		cell_to_qnode = self.serialize_cell_to_qnode(cell_to_qnode)
		self.add_region("Other", cell_to_qnode)

	def get_item(self, column: int, row: int) -> Union[str, Exception]:
		"""
		This function searches return the qnode of the value found at (column, row) cell.
		The catch here is that cell_to_qnode hash table is given preference over value_to_qnode dictionary.
		:param column:
		:param row:
		:return: qnode or exception
		"""
		cell_index = get_actual_cell_index((column, row))
		if self.region_qnodes['qnodes'].get(cell_index, None):
			return self.region_qnodes['qnodes'][cell_index]
		else:
			raise Exception('No QNode Exists for the cell: ', get_actual_cell_index((column, row)))

	def serialize_cell_to_qnode(self, cell_to_qnode):
		"""
		This function serializes the cell_to_qnode dictionary
		:return:
		"""
		serialized_dict = dict()
		for cell, value in cell_to_qnode.items():
			cell = get_actual_cell_index(cell)
			serialized_dict[cell] = value
		return serialized_dict

	def check_other_for_common_cells(self, region):
		if 'Other' in self.region_qnodes['regions'] and region != 'Other':
			self.region_qnodes['regions']['Other'] = sorted(list(set(self.region_qnodes['regions']['Other']) - set(self.region_qnodes['regions'][region])), key=natural_sort_key)

	def add_region(self, region, cell_qnode_map):
		self.region_qnodes['regions'][region] = sorted(list(cell_qnode_map.keys()), key=natural_sort_key)
		self.region_qnodes['qnodes'].update(cell_qnode_map)
		self.check_other_for_common_cells(region)

	def delete_region(self, region):
		if region == 'All':
			self.region_qnodes = {'regions': dict(), 'qnodes': dict()}
		elif region in self.region_qnodes['regions']:
			for cell in self.region_qnodes['regions'][region]:
				if cell in self.region_qnodes['qnodes']:
					del self.region_qnodes['qnodes'][cell]
			del self.region_qnodes['regions'][region]
