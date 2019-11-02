class RowRangeExpression:
	def __init__(self) -> None:
		self.from_row_variable = None
		self.to_row_variable = None

	def evaluate(self, bindings: dict) -> tuple:
		"""
		This function evaluates the from and to row variable and find its respective index in the excel file.
		:param bindings:
		:return: row variable of type int
		"""
		frv = self.from_row_variable.evaluate(bindings)
		trv = self.to_row_variable.evaluate(bindings)
		return frv, trv

	def check_for_top(self) -> bool:
		"""
		this function checks if $top is present as a column variable at any leaf
		:return:
		"""
		has_top = False
		if self.from_row_variable:
			has_top = self.from_row_variable.check_for_top()
		if self.to_row_variable:
			has_top = has_top or self.to_row_variable.check_for_top()
		return has_top

	def check_for_bottom(self) -> bool:
		"""
		this function checks if $bottom is present as a column variable at any leaf
		:return:
		"""
		has_bottom = False
		if self.from_row_variable:
			has_bottom = self.from_row_variable.check_for_bottom()
		if self.to_row_variable:
			has_bottom = has_bottom or self.to_row_variable.check_for_bottom()
		return has_bottom
