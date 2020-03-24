from backend_code.grammar import ValueExpression, CellExpression, ColumnExpression, RowExpression,\
    ColumnVariable, RowVariable, CellOperatorArgument, BooleanEquation, BooleanExpression, OrExpression,\
        AndExpression, Expression, ItemExpression, ColumnRangeExpression, RowRangeExpression


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
    'item_expression': ItemExpression,
    'column_range_expression': ColumnRangeExpression,
    'row_range_expression': RowRangeExpression
}
