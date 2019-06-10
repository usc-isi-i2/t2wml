from typing import Union


class AndExpression:
	def __init__(self):
		self.expression = []

	def evaluate(self, bindings: dict) -> Union[str, int, bool]:
		"""
		This function evaluates all the expressions using boolean AND operator
		:param bindings:
		:return: True or False or the expression itself if there's only one expression
		"""
		if len(self.expression) == 1:
			return self.expression[0].evaluate(bindings)

		for i in range(len(self.expression)):
			if not self.expression[i].evaluate(bindings):
				return False
		return True
