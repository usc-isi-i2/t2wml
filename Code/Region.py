from Code.RegionNode import RegionNode
from collections import OrderedDict


class Region:
	def __init__(self, left: int, right: int, top: int, bottom: int):
		self.left = left
		self.right = right
		self.top = top
		self.bottom = bottom
		self.sheet = self.create_sheet()

	def create_sheet(self) -> dict:
		"""
		This function creates the region which is a dictionary of RegionNode objects with keys as (column, row)
		:return: region as a dict
		"""
		sheet = OrderedDict()
		previous = None
		for column in range(self.left + 1, self.right):
			for row in range(self.top + 1, self.bottom):
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
					sheet[previous].next = (column, row)
				previous = (column, row)

				sheet[(column, row)] = region_node
		return sheet

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
		return list(self.sheet.keys())[0]
