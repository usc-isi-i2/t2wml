from OrExpression import OrExpression
from typing import Union


class BooleanExpression:
	def __init__(self):
		self.or_expression = []
		self.operator = None

	def evaluate(self, bindings: dict) -> Union[str, int, bool]:
		"""
		This function returns evaluates the or_expressions using operators.
		:param bindings:
		:return: True or False or the expression itself if there's only one expression
		"""
		evaluated_or_expression = []
		for i in range(len(self.or_expression)):
			evaluated_or_expression.append(str(self.or_expression[i].evaluate(bindings)))
		if self.operator:
			if self.operator == "=":
				return evaluated_or_expression[0] == evaluated_or_expression[1]
			elif self.operator == "!=":
				return evaluated_or_expression[0] != evaluated_or_expression[1]
			elif self.operator == "contains":
				if evaluated_or_expression[1] in evaluated_or_expression[0]:
					return True
				return False
			elif self.operator == "starts_with":
				if evaluated_or_expression[0].startswith(evaluated_or_expression[1]):
					return True
				return False
			elif self.operator == "ends_with":
				if evaluated_or_expression[0].endswith(evaluated_or_expression[1]):
					return True
				return False

		return evaluated_or_expression[0]
