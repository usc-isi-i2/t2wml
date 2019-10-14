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
