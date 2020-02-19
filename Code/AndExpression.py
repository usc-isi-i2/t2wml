from typing import Union

from Code.T2WMLException import T2WMLException


class AndExpression:
	def __init__(self):
		self.expression = []
		self.operator = None

	def get_variable_cell_operator_arguments(self) -> set:
		variables = set()
		if self.expression:
			for i in self.expression:
				variables |= i.get_variable_cell_operator_arguments()
		return variables

	def evaluate(self, bindings: dict) -> Union[bool, Exception]:
		"""
		This function evaluates all the expressions using boolean AND operator
		:param bindings:
		:return: True or False or the expression itself if there's only one expression
		"""
		evaluated_expression = []
		for i in range(len(self.expression)):
			evaluated_expression.append(self.expression[i].evaluate(bindings))
		if self.operator:
			if self.operator == "=":
				if isinstance(evaluated_expression[0], list) and not isinstance(evaluated_expression[1], list):
					for i in evaluated_expression[0]:
						if i != evaluated_expression[1]:
							return False
					return True
				elif not isinstance(evaluated_expression[0], list) and not isinstance(evaluated_expression[1], list):
					if str(evaluated_expression[1]) == "":
						if evaluated_expression[0]:
							return False
						return True
					else:
						return str(evaluated_expression[0]) == str(evaluated_expression[1])
			elif self.operator == "!=":
				if isinstance(evaluated_expression[0], list) and not isinstance(evaluated_expression[1], list):
					for i in evaluated_expression[0]:
						if i == evaluated_expression[1]:
							return False
					return True
				elif not isinstance(evaluated_expression[0], list) and not isinstance(evaluated_expression[1], list):
					return str(evaluated_expression[0]) != str(evaluated_expression[1])
			elif self.operator == "contains":
				if isinstance(evaluated_expression[0], list) and not isinstance(evaluated_expression[1], list):
					for i in evaluated_expression[0]:
						if evaluated_expression[1] not in i:
							return False
					return True
				elif not isinstance(evaluated_expression[0], list) and not isinstance(evaluated_expression[1], list):
					if evaluated_expression[1] in evaluated_expression[0]:
						return True
					return False
			elif self.operator == "starts_with":
				if isinstance(evaluated_expression[0], list) and not isinstance(evaluated_expression[1], list):
					for i in evaluated_expression[0]:
						if not i.startswith(evaluated_expression[1]):
							return False
					return True
				elif not isinstance(evaluated_expression[0], list) and not isinstance(evaluated_expression[1], list):
					if str(evaluated_expression[0]).startswith(str(evaluated_expression[1])):
						return True
					return False
			elif self.operator == "ends_with":
				if isinstance(evaluated_expression[0], list) and not isinstance(evaluated_expression[1], list):
					for i in evaluated_expression[0]:
						if not i.endswith(evaluated_expression[1]):
							return False
					return True
				elif not isinstance(evaluated_expression[0], list) and not isinstance(evaluated_expression[1], list):
					if str(evaluated_expression[0]).endswith(str(evaluated_expression[1])):
						return True
					return False
			else:
				raise Exception("T2WMLException.InvalidOperator", T2WMLException.InvalidOperator.value, "Unrecognized operator '" + self.operator +"' found." )
		else:
			if evaluated_expression[0] is not None and evaluated_expression[0] != "":
				return True
			return False

	def check_for_left(self) -> bool:
		"""
		this function checks if $left is present as a column variable
		:return:
		"""
		has_left = False
		if self.expression:
			for i in self.expression:
				has_left = has_left or i.check_for_left()
		return has_left

	def check_for_right(self) -> bool:
		"""
		this function checks if $right is present as a column variable
		:return:
		"""
		has_right = False
		if self.expression:
			for i in self.expression:
				has_right = has_right or i.check_for_right()
		return has_right

	def check_for_top(self) -> bool:
		"""
		this function checks if $top is present as a column variable
		:return:
		"""
		has_top = False
		if self.expression:
			for i in self.expression:
				has_top = has_top or i.check_for_top()
		return has_top

	def check_for_bottom(self) -> bool:
		"""
		this function checks if $bottom is present as a column variable
		:return:
		"""
		has_bottom = False
		if self.expression:
			for i in self.expression:
				has_bottom = has_bottom or i.check_for_bottom()
		return has_bottom
