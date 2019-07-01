from Code.ValueExpression import ValueExpression
from Code.CellExpression import CellExpression
from Code.ColumnExpression import ColumnExpression
from Code.RowExpression import RowExpression
from Code.ColumnVariable import ColumnVariable
from Code.RowVariable import RowVariable
from Code.CellOperatorArgument import CellOperatorArgument
from Code.BooleanEquation import BooleanEquation
from Code.BooleanExpression import BooleanExpression
from Code.OrExpression import OrExpression
from Code.AndExpression import AndExpression
from Code.Expression import Expression
from Code.ItemExpression import ItemExpression


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
