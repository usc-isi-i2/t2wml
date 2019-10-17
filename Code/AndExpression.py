from typing import Union


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
				# Report error that this expression is semantically incorrect
				return Exception('This Expression is semantically incorrect')
		else:
			if evaluated_expression[0] is not None and evaluated_expression[0] != "":
				return True
			return False
