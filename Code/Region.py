import pyexcel

from Code.RegionNode import RegionNode
from collections import OrderedDict
from Code.ItemTable import ItemTable
from Code.utility_functions import check_if_string_is_invalid


class Region:
	def __init__(self, region_params: dict, item_table: ItemTable, data_file_path: str, sheet_name: str):
		self.left = region_params['left']
		self.right = region_params['right']
		self.top = region_params['top']
		self.bottom = region_params['bottom']
		self.skip_row = region_params['skip_row']
		self.skip_column = region_params['skip_column']
		self.skip_cell = region_params['skip_cell']
		self.sheet = OrderedDict()
		self.create_sheet(item_table, data_file_path, sheet_name)

	def create_sheet(self, item_table, data_file_path, sheet_name) -> None:
		"""
		This function creates the region which is a dictionary of RegionNode objects with keys as (column, row)
		:return: region as a dict
		"""
		previous = None
		data_sheet = pyexcel.get_sheet(sheet_name=sheet_name, file_name=data_file_path)
		temp_bindings = {'$top': self.top, '$bottom': self.bottom, '$right': self.right, '$left': self.left, 'excel_sheet': data_sheet, 'item_table': item_table}
		skipped_rows = set()
		skipped_columns = set()
		skipped_cells = set()

		for column in range(self.left + 1, self.right):
			for row in range(self.top + 1, self.bottom):
				temp_bindings['$col'] = column
				temp_bindings['$row'] = row
				row_be_skipped = False
				column_be_skipped = False
				cell_be_skipped = False
				is_cell_value_invalid = False

				if check_if_string_is_invalid(str(temp_bindings['excel_sheet'][row, column])):
					is_cell_value_invalid = True

				if self.skip_row:
					for i in range(len(self.skip_row)):
						row_be_skipped = row_be_skipped or self.skip_row[i].evaluate(temp_bindings)

				if self.skip_column:
					for i in range(len(self.skip_column)):
						column_be_skipped = column_be_skipped or self.skip_column[i].evaluate(temp_bindings)

				if self.skip_cell:
					for i in range(len(self.skip_cell)):
						cell_be_skipped = cell_be_skipped or self.skip_cell[i].evaluate(temp_bindings)

				if row_be_skipped:
					skipped_rows.add(row)

				if column_be_skipped:
					skipped_columns.add(column)

				if cell_be_skipped or is_cell_value_invalid:
					skipped_cells.add((column, row))

				region_node = RegionNode()
				if row - 1 == self.top:
					region_node.top = None
				else:
					region_node.top = (column, row - 1)

				if row + 1 == self.bottom:
					region_node.bottom = None
				else:
					region_node.bottom = (column, row + 1)

				if column - 1 == self.left:
					region_node.left = None
				else:
					region_node.left = (column - 1, row)

				if column + 1 == self.right:
					region_node.right = None
				else:
					region_node.right = (column + 1, row)

				region_node.previous = previous
				if previous:
					self.sheet[previous].next = (column, row)
				previous = (column, row)

				self.sheet[(column, row)] = region_node

		for row in skipped_rows:
			for col in range(self.left + 1, self.right):
				if (col, row) in self.sheet:
					self.add_hole(row, col, col)

		for col in skipped_columns:
			for row in range(self.top + 1, self.bottom):
				if (col, row) in self.sheet:
					self.add_hole(row, col, col)

		for col, row in skipped_cells:
			if (col, row) in self.sheet:
				self.add_hole(row, col, col)

	def add_hole(self, row: int, start_column: int, end_column: int) -> None:
		"""
		This Function adds holes in the region by updating the left, right, top, bottom, next and previous members
		of Region Nodes around the hole.
		Once the above operation is complete the cells in the hole are deleted from the region
		:param row:
		:param start_column:
		:param end_column:
		:return: None
		"""
		if self.sheet[(start_column, row)].left:
			self.sheet[self.sheet[(start_column, row)].left].right = self.sheet[(end_column, row)].right
		if self.sheet[(end_column, row)].right:
			self.sheet[self.sheet[(end_column, row)].right].left = self.sheet[(start_column, row)].left

		for i in range(start_column, end_column + 1):
			if (i, row) in self.sheet:
				if self.sheet[(i, row)].top:
					self.sheet[self.sheet[(i, row)].top].bottom = self.sheet[(i, row)].bottom
				if self.sheet[(i, row)].previous:
					self.sheet[self.sheet[(i, row)].previous].next = self.sheet[(i, row)].next

				if self.sheet[(i, row)].bottom:
					self.sheet[self.sheet[(i, row)].bottom].top = self.sheet[(i, row)].top
				if self.sheet[(i, row)].next:
					self.sheet[self.sheet[(i, row)].next].previous = self.sheet[(i, row)].previous

				del self.sheet[(i, row)]


	def get_left(self, col: int, row: int, steps: int = 1) -> tuple:
		"""
		This functions returns the cell index steps away from the current cell towards left
		:param col:
		:param row:
		:param steps:
		:return: cell index
		"""
		cell = (col, row)
		for i in range(steps):
			cell = self.sheet[cell].left
			if not cell:
				return None
		return cell

	def get_right(self, col: int, row: int, steps: int = 1) -> tuple:
		"""
		This functions returns the cell index steps away from the current cell towards right
		:param col:
		:param row:
		:param steps:
		:return: cell index
		"""
		cell = (col, row)
		for i in range(steps):
			cell = self.sheet[cell].right
			if not cell:
				return None
		return cell

	def get_top(self, col: int, row: int, steps: int = 1) -> tuple:
		"""
		This functions returns the cell index steps away from the current cell towards top
		:param col:
		:param row:
		:param steps:
		:return: cell index
		"""
		cell = (col, row)
		for i in range(steps):
			cell = self.sheet[cell].top
			if not cell:
				return None
		return cell

	def get_bottom(self, col: int, row: int, steps: int = 1) -> tuple:
		"""
		This functions returns the cell index steps away from the current cell towards bottom
		:param col:
		:param row:
		:param steps:
		:return: cell index
		"""
		cell = (col, row)
		for i in range(steps):
			cell = self.sheet[cell].bottom
			if not cell:
				return None
		return cell

	def get_next(self, col: int, row: int, steps: int = 1) -> tuple:
		"""
		This functions returns the next cell index steps away from the current cell
		:param col:
		:param row:
		:param steps:
		:return: cell index
		"""
		cell = (col, row)
		for i in range(steps):
			cell = self.sheet[cell].next
			if not cell:
				return None
		return cell

	def get_previous(self, col: int, row: int, steps: int = 1) -> tuple:
		"""
		This functions returns the previous cell index steps away from the current cell
		:param col:
		:param row:
		:param steps:
		:return: cell index
		"""
		cell = (col, row)
		for i in range(steps):
			cell = self.sheet[cell].previous
			if not cell:
				return None
		return cell

	def get_head(self) -> list:
		"""
		This function returns the head of the region
		:return:
		"""
		if self.sheet:
			return list(self.sheet.keys())[0]
		else:
			return None, None
