from typing import Union


class ItemExpression:
	def __init__(self) -> None:
		self.cell_expression = None
		self.boolean_equation = None

	def evaluate(self, bindings: dict) -> Union[str, int, list,  None]:
		"""
		This function calls evaluate function of its respective not null members
		and then finds the respective Q or Pnode redenoted by the value of that cell in the excel file
		:param bindings:
		:return: value of a cell in the excel file
		"""
		if not bindings['item_table']:
			return None
		else:
			response = None
			if self.cell_expression:
				ce, re = self.cell_expression.evaluate(bindings)
				if isinstance(ce, tuple) and isinstance(re, int):
					response = list()
					for i in ce:
						response.append(bindings["item_table"].get_item(i, re))
				elif isinstance(re, tuple) and isinstance(ce, int):
					response = list()
					for i in re:
						response.append(bindings["item_table"].get_item(ce, i))
				elif isinstance(ce, int) and isinstance(re, int):
					response = bindings["item_table"].get_item(ce, re)
			else:
				cell_expression = self.boolean_equation.evaluate(bindings)
				if cell_expression:
					ce = cell_expression[0]
					re = cell_expression[1]
					response = bindings["item_table"].get_item(ce, re)
				else:
					raise ValueError("Invalid Row and Column values")
			return response

	def get_cell(self, bindings: dict) -> tuple:
		"""
		This function returns the cell index on which this expression will evaluate
		:param bindings:
		:return:
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
		return ce, re

	def evaluate_and_get_cell(self, bindings: dict) -> tuple:
		"""
		This function evaluates the ItemExpression and returns the result with the cell index
		:param bindings:
		:return:
		"""
		if not bindings['item_table']:
			return None
		else:
			response = None
			if self.cell_expression:
				ce, re = self.cell_expression.evaluate(bindings)
				if isinstance(ce, tuple) and isinstance(re, int):
					response = list()
					for i in ce:
						response.append(bindings["item_table"].get_item(i, re))
				elif isinstance(re, tuple) and isinstance(ce, int):
					response = list()
					for i in re:
						response.append(bindings["item_table"].get_item(ce, i))
				elif isinstance(ce, int) and isinstance(re, int):
					response = bindings["item_table"].get_item(ce, re)
			else:
				cell_expression = self.boolean_equation.evaluate(bindings)
				if cell_expression:
					ce = cell_expression[0]
					re = cell_expression[1]
					response = bindings["item_table"].get_item(ce, re)
				else:
					raise ValueError("Invalid Row and Column values")
		return ce, re, response