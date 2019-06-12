class BooleanExpression:
	def __init__(self):
		self.or_expression = []

	def evaluate(self, bindings: dict) -> bool:
		"""
		This function returns evaluates the or_expressions using operators.
		:param bindings:
		:return: True or False or the expression itself if there's only one expression
		"""
		for i in range(len(self.or_expression)):
			if self.or_expression[i].evaluate(bindings):
				return True
		return False
