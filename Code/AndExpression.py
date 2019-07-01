class AndExpression:
	def __init__(self):
		self.expression = []
		self.operator = None

	def evaluate(self, bindings: dict) -> bool:
		"""
		This function evaluates all the expressions using boolean AND operator
		:param bindings:
		:return: True or False or the expression itself if there's only one expression
		"""
		evaluated_expression = []
		for i in range(len(self.expression)):
			evaluated_expression.append(str(self.expression[i].evaluate(bindings)))

		if self.operator:
			if self.operator == "=":
				return evaluated_expression[0] == evaluated_expression[1]
			elif self.operator == "!=":
				return evaluated_expression[0] != evaluated_expression[1]
			elif self.operator == "contains":
				if evaluated_expression[1] in evaluated_expression[0]:
					return True
				return False
			elif self.operator == "starts_with":
				if evaluated_expression[0].startswith(evaluated_expression[1]):
					return True
				return False
			elif self.operator == "ends_with":
				if evaluated_expression[0].endswith(evaluated_expression[1]):
					return True
				return False
		else:
			if evaluated_expression[0] is not None and evaluated_expression[0] != "":
				return True
			return False
