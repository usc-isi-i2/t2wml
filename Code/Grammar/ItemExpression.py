from typing import Union

from Code import T2WMLExceptions


class ItemExpression:
	def __init__(self) -> None:
		self.cell_expression = None
		self.boolean_equation = None
		self.variables = None
		self.context = None

	def get_variable_cell_operator_arguments(self) -> set:
		if self.cell_expression:
			self.variables = self.cell_expression.get_variable_cell_operator_arguments()
		elif self.boolean_equation:
			self.variables = self.cell_expression.get_variable_cell_operator_arguments()
		return self.variables

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
						response.append(bindings["item_table"].get_item(i, re, self.context))
				elif isinstance(re, tuple) and isinstance(ce, int):
					response = list()
					for i in re:
						response.append(bindings["item_table"].get_item(ce, i, self.context))
				elif isinstance(ce, int) and isinstance(re, int):
					response = bindings["item_table"].get_item(ce, re, self.context)
			else:
				cell_expression = self.boolean_equation.evaluate(bindings)
				if cell_expression:
					ce = cell_expression[0]
					re = cell_expression[1]
					response = bindings["item_table"].get_item(ce, re, self.context)
				else:
					raise T2WMLExceptions.ValueErrorInYAMLFileException("Boolean Equation inside the Item Expression evaluates to an invalid ouput. It should return a cell expression.")
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
				raise T2WMLExceptions.ValueErrorInYAMLFileException(
				                "Boolean Equation inside the Item Expression evaluates to an invalid ouput. It should return a cell expression.")

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
						response.append(bindings["item_table"].get_item(i, re, self.context))
				elif isinstance(re, tuple) and isinstance(ce, int):
					response = list()
					for i in re:
						response.append(bindings["item_table"].get_item(ce, i, self.context))
				elif isinstance(ce, int) and isinstance(re, int):
					response = bindings["item_table"].get_item(ce, re, self.context)
			else:
				cell_expression = self.boolean_equation.evaluate(bindings)
				if cell_expression:
					ce = cell_expression[0]
					re = cell_expression[1]
					response = bindings["item_table"].get_item(ce, re, self.context)
				else:
					raise T2WMLExceptions.ValueErrorInYAMLFileException(
					                "Boolean Equation inside the Item Expression evaluates to an invalid ouput. It should return a cell expression.")
		return ce, re, response

	def check_for_left(self) -> bool:
		"""
		this function checks if $left is present as a column variable at any leaf
		:return:
		"""
		if self.cell_expression:
			return self.cell_expression.check_for_left()
		elif self.boolean_equation:
			return self.boolean_equation.check_for_left()
		else:
			return False

	def check_for_right(self) -> bool:
		"""
		this function checks if $right is present as a column variable at any leaf
		:return:
		"""
		if self.cell_expression:
			return self.cell_expression.check_for_right()
		elif self.boolean_equation:
			return self.boolean_equation.check_for_right()
		else:
			return False

	def check_for_top(self) -> bool:
		"""
		this function checks if $top is present as a column variable at any leaf
		:return:
		"""
		if self.cell_expression:
			return self.cell_expression.check_for_top()
		elif self.boolean_equation:
			return self.boolean_equation.check_for_top()
		else:
			return False

	def check_for_bottom(self) -> bool:
		"""
		this function checks if $bottom is present as a column variable at any leaf
		:return:
		"""
		if self.cell_expression:
			return self.cell_expression.check_for_bottom()
		elif self.boolean_equation:
			return self.boolean_equation.check_for_bottom()
		else:
			return False