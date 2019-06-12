from typing import Union


class OrExpression:
	def __init__(self):
		self.and_expression = []

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
