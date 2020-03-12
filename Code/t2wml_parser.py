from lark import Lark
from lark.tree import Tree
from lark.exceptions import UnexpectedCharacters
import os
from typing import Union

from Code import T2WMLExceptions
from Code.dictionary import class_dictionary
from Code.bindings import bindings
from Code.Grammar import ValueExpression, BooleanEquation, ColumnExpression,  RowExpression, ColumnRangeExpression, RowRangeExpression
from pathlib import Path

__CWD__ = os.getcwd()

# instantiate Lark Parser
parser = Lark(open(str(Path(__file__).parent.absolute() / 'grammar.lark')))


def generate_tree(program: str) -> Union[ValueExpression]:
    """
    This function generates the parse tree and creates a tree of class objects
    :param program:
    :return: root of the tree
    """
    try:
        parse_tree = parser.parse(program)
    except UnexpectedCharacters as exception:
        raise T2WMLExceptions.InvalidT2WMLExpressionException(str(exception))
    root = class_dictionary[parse_tree.children[0].data]()
    for instruction in parse_tree.children[0].children:
        if isinstance(instruction, Tree):
            create_class_tree(instruction, root)
    return root


def if_tree_creator(instruction, root_arg):
    for i in instruction.children:
        if isinstance(i, Tree):
            create_class_tree(i, root_arg)

def create_class_tree(instruction: Tree, root: Union[ValueExpression]) -> None:
    """
    This function creates a tree of class objects suing the parse tree
    :param instruction:
    :param root:
    :return: None
    """

    if instruction.data == "cell_operator":
        root.operations.append({"cell_operator": instruction.children[0][0]})
    elif instruction.data == "operator":
        root.operator = instruction.children[0]
    elif instruction.data == "context":
        if instruction.children:
            root.context = instruction.children[0]
    elif instruction.data == "expression_string":
        node = class_dictionary["expression"]()
        node.string = instruction.children[0]
        root.expression.append(node)
    else:
        node = class_dictionary[instruction.data]()
        if instruction.data == "cell_expression":
            root.cell_expression = node
            if_tree_creator(instruction, root.cell_expression)
        elif instruction.data == "column_expression":
            root.column_expression = node
            for i in instruction.children:
                create_class_tree(i, root.column_expression)
        elif instruction.data == "row_expression":
            root.row_expression = node
            for i in instruction.children:
                create_class_tree(i, root.row_expression)
        elif instruction.data == "row_range_expression":
            root.row_range_expression = node
            if_tree_creator(instruction, root.row_range_expression)
        elif instruction.data == "column_range_expression":
            root.column_range_expression = node
            if_tree_creator(instruction, root.column_range_expression)
        elif instruction.data == "column_variable":
            if isinstance(root, ColumnRangeExpression):
                if root.from_column_variable:
                    root.to_column_variable = node
                    root.to_column_variable.value = instruction.children[0]
                else:
                    root.from_column_variable = node
                    root.from_column_variable.value = instruction.children[0]
            else:
                root.column_variable = node
                root.column_variable.value = instruction.children[0]
        elif instruction.data == "row_variable":
            if isinstance(root, RowRangeExpression):
                if root.from_row_variable:
                    root.to_row_variable = node
                    root.to_row_variable.value = instruction.children[0]
                else:
                    root.from_row_variable = node
                    root.from_row_variable.value = instruction.children[0]
            else:
                root.row_variable = node
                root.row_variable = node
                root.row_variable.value = instruction.children[0]
        elif instruction.data == "cell_operator_argument":
            node.value = instruction.children[0][0]
            root.operations[-1]["cell_operator_argument"] = node
        elif instruction.data == "expression":
            if root.expression is None:
                root.expression = node
                if_tree_creator(instruction, root.expression)
            else:
                root.expression.append(node)
                if_tree_creator(instruction, root.expression[-1])
        elif instruction.data == "and_expression":
            root.and_expression.append(node)
            if_tree_creator(instruction, root.and_expression[-1])
        elif instruction.data == "or_expression":
            root.or_expression.append(node)
            if_tree_creator(instruction, root.or_expression[-1])
        elif instruction.data == "boolean_expression":
            root.boolean_expression = node
            if_tree_creator(instruction, root.boolean_expression)
        elif instruction.data == "boolean_equation":
            root.boolean_equation = node
            if_tree_creator(instruction, root.boolean_equation)
        elif instruction.data == "value_expression":
            root.value_expression = node
            if_tree_creator(instruction, root.value_expression)
        elif instruction.data == "item_expression":
            root.item_expression = node
            if_tree_creator(instruction, root.item_expression)
        else:
            print("time waste instruction")
        


def get_cell(root: str) -> tuple:
    """
    This function evaluates the expression if it is a BooleanEquation, RowExpression or ColumnExpression object
    otherwise it returns the cell index on which that Expression operates
    :param root:
    :return:
    """
    if isinstance(root, (BooleanEquation, RowExpression, ColumnExpression)):
        result = root.evaluate(bindings)
    else:
        result = root.get_cell(bindings)
    return result

