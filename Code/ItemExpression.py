from typing import Union


class ItemExpression:
	def __init__(self) -> None:
		self.cell_expression = None
		self.boolean_equation = None

	def evaluate(self, bindings: dict) -> Union[str, int]:
		"""
		This function calls evaluate function of its respective not null members
		and then finds the respective Q or Pnode redenoted by the value of that cell in the excel file
		:param bindings:
		:return: value of a cell in the excel file
		"""
		if self.cell_expression:
			ce, re = self.cell_expression.evaluate(bindings)
		else:
			cell_expression = self.boolean_equation.evaluate(bindings)
			if cell_expression:
				ce = cell_expression[0]
				re = cell_expression[1]
			else:
				raise ValueError("Invalid Row and Column values")
		value = bindings['excel_sheet'][re, ce]
		if bindings['item_table']:
			return bindings["item_table"].get_item(ce, re, value)
		else:
			return None

	def get_cell(self, bindings: dict) -> tuple:
		if self.cell_expression:
			ce, re = self.cell_expression.evaluate(bindings)
		else:
			cell_expression = self.boolean_equation.evaluate(bindings)
			if cell_expression:
				ce = cell_expression[0]
				re = cell_expression[1]
			else:
				raise ValueError("Invalid Row and Column values")
		return ce, re

	def evaluate_and_get_cell(self, bindings: dict) -> tuple:
		if self.cell_expression:
			ce, re = self.cell_expression.evaluate(bindings)
		else:
			cell_expression = self.boolean_equation.evaluate(bindings)
			if cell_expression:
				ce = cell_expression[0]
				re = cell_expression[1]
			else:
				raise ValueError("Invalid row or column value")
		value = bindings['excel_sheet'][re, ce]
		return ce, re, bindings["item_table"].get_item(ce, re, value)