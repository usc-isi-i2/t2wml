from ValueExpression import ValueExpression
from CellExpression import CellExpression
from ColumnExpression import ColumnExpression
from RowExpression import RowExpression
from ColumnVariable import ColumnVariable
from RowVariable import RowVariable
from CellOperatorArgument import CellOperatorArgument
from BooleanEquation import BooleanEquation
from BooleanExpression import BooleanExpression
from OrExpression import OrExpression
from AndExpression import AndExpression
from Expression import Expression
from ItemExpression import ItemExpression


class_dictionary = {
    'value_expression': ValueExpression,
    'cell_expression': CellExpression,
    'column_expression': ColumnExpression,
    'row_expression': RowExpression,
    'column_variable': ColumnVariable,
    'row_variable': RowVariable,
    'cell_operator_argument': CellOperatorArgument,
    'boolean_equation': BooleanEquation,
    'boolean_expression': BooleanExpression,
    'or_expression': OrExpression,
    'and_expression': AndExpression,
    'expression': Expression,
    'item_expression': ItemExpression
}
