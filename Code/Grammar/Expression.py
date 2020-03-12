from typing import Union


class Expression:
	def __init__(self):
		self.value_expression = None
		self.item_expression = None
		self.column_expression = None
		self.row_expression = None
		self.string = None
		self.cell_expression = None

	def get_variable_cell_operator_arguments(self) -> set:
		variables = set()
		if self.value_expression:
			variables = self.value_expression.get_variable_cell_operator_arguments()
		elif self.item_expression:
			variables = self.item_expression.get_variable_cell_operator_arguments()
		elif self.column_expression:
			variables = self.column_expression.get_variable_cell_operator_arguments()
		elif self.row_expression:
			variables = self.row_expression.get_variable_cell_operator_arguments()
		elif self.cell_expression:
			variables = self.cell_expression.get_variable_cell_operator_arguments()
		return variables

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

	def evaluate_and_get_cell(self, bindings: dict) -> tuple:
		"""
		This function returns the evaluated value of the not null members
		:param bindings:
		:return: str or int based on the type of expression
		"""
		if self.value_expression:
			return self.value_expression.evaluate_and_get_cell(bindings)
		elif self.item_expression:
			return self.item_expression.evaluate_and_get_cell(bindings)
		elif self.column_expression:
			return None, None, self.column_expression.evaluate(bindings)
		elif self.row_expression:
			return None, None, self.row_expression.evaluate(bindings)
		elif self.cell_expression:
			return self.cell_expression.evaluate(bindings), None
		else:
			return None, None, str(self.string)[1:-1]

	def check_for_left(self) -> bool:
		"""
		this function checks if $left is present as a column variable at any leaf
		:return:
		"""
		has_left = False
		if self.value_expression:
			has_left = self.value_expression.check_for_left()
		elif self.item_expression:
			has_left = self.item_expression.check_for_left()
		elif self.column_expression:
			has_left = self.column_expression.check_for_left()
		elif self.cell_expression:
			has_left = self.cell_expression.check_for_left()
		return has_left

	def check_for_right(self) -> bool:
		"""
		this function checks if $right is present as a column variable at any leaf
		:return:
		"""
		has_right = False
		if self.value_expression:
			has_right = self.value_expression.check_for_right()
		elif self.item_expression:
			has_right = self.item_expression.check_for_right()
		elif self.column_expression:
			has_right = self.column_expression.check_for_right()
		elif self.cell_expression:
			has_right = self.cell_expression.check_for_right()
		return has_right

	def check_for_top(self) -> bool:
		"""
		this function checks if $top is present as a column variable at any leaf
		:return:
		"""
		has_top = False
		if self.value_expression:
			has_top = self.value_expression.check_for_top()
		elif self.item_expression:
			has_top = self.item_expression.check_for_top()
		elif self.row_expression:
			has_top = self.row_expression.check_for_top()
		elif self.cell_expression:
			has_top = self.cell_expression.check_for_top()
		return has_top

	def check_for_bottom(self) -> bool:
		"""
		this function checks if $bottom is present as a column variable at any leaf
		:return:
		"""
		has_bottom = False
		if self.value_expression:
			has_bottom = self.value_expression.check_for_bottom()
		elif self.item_expression:
			has_bottom = self.item_expression.check_for_bottom()
		elif self.row_expression:
			has_bottom = self.row_expression.check_for_bottom()
		elif self.cell_expression:
			has_bottom = self.cell_expression.check_for_bottom()
		return has_bottom