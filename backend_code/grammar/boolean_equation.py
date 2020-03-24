from typing import Union, Tuple


class BooleanEquation:
	def __init__(self):
		self.boolean_expression = None
		self.expression = None
		self.variables = None

	def get_variable_cell_operator_arguments(self) -> set:
		boolean_expression_variables = set()
		expression_variables = set()
		if self.boolean_expression:
			boolean_expression_variables = self.boolean_expression.get_variable_cell_operator_arguments()
		if self.expression:
			expression_variables = self.expression.get_variable_cell_operator_arguments()
		self.variables = boolean_expression_variables | expression_variables
		return self.variables

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

	def evaluate_and_get_cell(self, bindings: dict) -> Tuple[int, int, Union[str,int]]:
		"""
		This function will evaluate the boolean expression and expression.
		If evaluated value of boolean expression is true then evaluated value of expression will be returned
		otherwise None will be returned
		:param bindings:
		:return: evaluated value of expression or None
		"""
		boolean_expression = self.boolean_expression.evaluate(bindings)
		col, row, expression = self.expression.evaluate_and_get_cell(bindings)
		if boolean_expression:
			return col, row, expression
		return None

	def check_for_left(self) -> bool:
		"""
		this function checks if $left is present as a column variable at any leaf
		:return:
		"""
		boolean_expression_has_left = False
		expression_has_left = False
		if self.boolean_expression:
			boolean_expression_has_left = self.boolean_expression.check_for_left()
		if self.expression:
			expression_has_left = self.expression.check_for_left()
		return boolean_expression_has_left or expression_has_left

	def check_for_right(self) -> bool:
		"""
		this function checks if $right is present as a column variable at any leaf
		:return:
		"""
		boolean_expression_has_right = False
		expression_has_right = False
		if self.boolean_expression:
			boolean_expression_has_right = self.boolean_expression.check_for_right()
		if self.expression:
			expression_has_right = self.expression.check_for_right()
		return boolean_expression_has_right or expression_has_right

	def check_for_top(self) -> bool:
		"""
		this function checks if $top is present as a column variable at any leaf
		:return:
		"""
		boolean_expression_has_top = False
		expression_has_top = False
		if self.boolean_expression:
			boolean_expression_has_top = self.boolean_expression.check_for_top()
		if self.expression:
			expression_has_top = self.expression.check_for_top()
		return boolean_expression_has_top or expression_has_top

	def check_for_bottom(self) -> bool:
		"""
		this function checks if $bottom is present as a column variable at any leaf
		:return:
		"""
		boolean_expression_has_bottom = False
		expression_has_bottom = False
		if self.boolean_expression:
			boolean_expression_has_bottom = self.boolean_expression.check_for_bottom()
		if self.expression:
			expression_has_bottom = self.expression.check_for_bottom()
		return boolean_expression_has_bottom or expression_has_bottom