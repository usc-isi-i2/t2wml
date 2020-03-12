from typing import Union


class OrExpression:
	def __init__(self):
		self.and_expression = []

	def get_variable_cell_operator_arguments(self) -> set:
		variables = set()
		if self.and_expression:
			for i in self.and_expression:
				variables |= i.get_variable_cell_operator_arguments()
		return variables

	def evaluate(self, bindings: dict) -> bool:
		"""
		This function evaluates all the and expressions using boolean OR operator
		:param bindings:
		:return: True or False or the expression itself if there's only one expression
		"""
		for i in range(len(self.and_expression)):
			if not self.and_expression[i].evaluate(bindings):
				return False
		return True

	def check_for_left(self) -> bool:
		"""
		this function checks if $left is present as a column variable at any leaf
		:return:
		"""
		has_left = False
		if self.and_expression:
			for i in self.and_expression:
				has_left = has_left or i.check_for_left()
		else:
			has_left = False
		return has_left

	def check_for_right(self) -> bool:
		"""
		this function checks if $ is $right present as a column variable at any leaf
		:return:
		"""
		has_right = False
		if self.and_expression:
			for i in self.and_expression:
				has_right = has_right or i.check_for_right()
		else:
			has_right = False
		return has_right

	def check_for_top(self) -> bool:
		"""
		this function checks if $top is present as a column variable at any leaf
		:return:
		"""
		has_top = False
		if self.and_expression:
			for i in self.and_expression:
				has_top = has_top or i.check_for_top()
		else:
			has_top = False
		return has_top

	def check_for_bottom(self) -> bool:
		"""
		this function checks if $bottom is present as a column variable at any leaf
		:return:
		"""
		has_bottom = False
		if self.and_expression:
			for i in self.and_expression:
				has_bottom = has_bottom or i.check_for_bottom()
		else:
			has_bottom = False
		return has_bottom
