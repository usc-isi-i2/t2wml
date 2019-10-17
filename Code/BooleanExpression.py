class BooleanExpression:
	def __init__(self):
		self.or_expression = []

	def get_variable_cell_operator_arguments(self) -> set:
		variables = set()
		if self.or_expression:
			for i in self.or_expression:
				variables |= i.get_variable_cell_operator_arguments()
		return variables

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
