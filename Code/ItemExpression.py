from typing import Union


class ItemExpression:
	def __init__(self) -> None:
		self.cell_expression = None

	def evaluate(self, bindings: dict) -> Union[str, int]:
		"""
		This function calls evaluate function of its respective not null members
		and then finds the respective Q or Pnode redenoted by the value of that cell in the excel file
		:param bindings:
		:return: value of a cell in the excel file
		"""
		ce, re = self.cell_expression.evaluate(bindings)
		value = bindings['excel_sheet'][re, ce]
		return bindings["item_table"].get_item(ce, re, value)

