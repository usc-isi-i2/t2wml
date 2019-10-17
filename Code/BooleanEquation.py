from typing import Union


class BooleanEquation:
	def __init__(self):
		self.boolean_expression = None
		self.expression = None

	def get_variable_cell_operator_arguments(self) -> set:
		boolean_expression_variables = set()
		expression_variables = set()
		if self.boolean_expression:
			boolean_expression_variables = self.boolean_expression.get_variable_cell_operator_arguments()
		if self.expression:
			expression_variables = self.expression.get_variable_cell_operator_arguments()
		return boolean_expression_variables | expression_variables

	def evaluate(self, bindings: dict) -> Union[str, int, None]:
		"""
		This function will evaluate the boolean expression and expression.
		If evaluated value of boolean expression is true then evaluated value of expression will be returned
		otherwise None will be returned
		:param bindings:
		:return: evaluated value of expression or None
		"""
		boolean_expression = self.boolean_expression.evaluate(bindings)
		expression = self.expression.evaluate(bindings)
		if boolean_expression:
			return expression
		return None
