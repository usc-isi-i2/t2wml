from RegionNode import RegionNode

#under-development
class Region:
	def __init__(self, left: int, right: int, top: int, bottom: int):
		self.left = left
		self.right = right
		self.top = top
		self.bottom = bottom
		self.workbook = self.create_workbook(self.left, self.right, self.top, self.bottom)

	def create_workbook(self):
		workbook = {}
		previous = None
		next = None
		for column in  range(self.left + 1, self.right):
			for row in range(self.top + 1, self.bottom):
				region_node = RegionNode()
				if row - 1 == self.top:
					region_node.top = None
				else:
					region_node = (column, row - 1)
				
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
					workbook[previous].next = (column, row)
				previous = (column, row)

				workbook[(column, row)] = region_node
		return workbook


	def add_hole(self, row: int, start_column: int, end_column: int):
		pass

	def left(self, col: int, row: int, steps: int=1):
		pass

	def next(self, col: int, row: int, steps: int = 1):
		pass


# r = Region()
# r.test()
