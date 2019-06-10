from typing import Union


class Expression:
	def __init__(self):
		self.value_expression = None
		self.item_expression = None
		self.column_expression = None
		self.row_expression = None
		self.string = None
		self.cell_expression = None

	def evaluate(self, bindings: dict) -> Union[str, int]:
		"""
		This function returns the evaluated value of the not null members
		:param bindings:
		:return: str or int based on the type of expression
		"""
		if self.value_expression:
			return self.value_expression.evaluate(bindings)
		elif self.item_expression:
			return self.item_expression.evaluate(bindings)
		elif self.column_expression:
			return self.column_expression.evaluate(bindings)
		elif self.row_expression:
			return self.row_expression.evaluate(bindings)
		elif self.cell_expression:
			return self.cell_expression.evaluate(bindings)
		else:
			return str(self.string)[1:-1]


