from typing import Union


class OrExpression:
	def __init__(self):
		self.and_expression = []

	def evaluate(self, bindings: dict) -> Union[str, int, bool]:
		"""
		This function evaluates all the and expressions using boolean OR operator
		:param bindings:
		:return: True or False or the expression itself if there's only one expression
		"""
		if len(self.and_expression) == 1:
			return self.and_expression[0].evaluate(bindings)

		for i in range(len(self.and_expression)):
			if self.and_expression[i].evaluate(bindings):
				return True
		return False
