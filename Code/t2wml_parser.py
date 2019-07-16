from lark import Lark
from lark.tree import Tree
import os
from typing import Union
from Code.dictionary import class_dictionary
from Code.bindings import bindings
from Code.ValueExpression import ValueExpression
from Code.BooleanEquation import BooleanEquation
from Code.ColumnExpression import ColumnExpression
from Code.RowExpression import RowExpression
from pathlib import Path
__CWD__ = os.getcwd()

# instantiate Lark Parser
parser = Lark(open(Path.cwd() / 'Code/grammar.lark'))


def generate_tree(program: str) -> Union[ValueExpression]:
    """
    This function generates the parse tree and creates a tree of class objects
    :param program:
    :return: root of the tree
    """
    parse_tree = parser.parse(program)
    root = class_dictionary[parse_tree.children[0].data]()
    for instruction in parse_tree.children[0].children:
        if isinstance(instruction, Tree):
            create_class_tree(instruction, root)
    return root


def create_class_tree(instruction: Tree, root: Union[ValueExpression]) -> None:
    """
    This function creates a tree of class objects suing the parse tree
    :param instruction:
    :param root:
    :return: None
    """
    if instruction.data == "cell_expression":
        node = class_dictionary[instruction.data]()
        root.cell_expression = node
        for i in instruction.children:
            if isinstance(i, Tree):
                create_class_tree(i, root.cell_expression)
    elif instruction.data == "column_expression":
        node = class_dictionary[instruction.data]()
        root.column_expression = node
        for i in instruction.children:
            create_class_tree(i, root.column_expression)
    elif instruction.data == "row_expression":
        node = class_dictionary[instruction.data]()
        root.row_expression = node
        for i in instruction.children:
            create_class_tree(i, root.row_expression)
    elif instruction.data == "column_variable":
        node = class_dictionary[instruction.data]()
        root.column_variable = node
        root.column_variable.value = instruction.children[0]
    elif instruction.data == "row_variable":
        node = class_dictionary[instruction.data]()
        root.row_variable = node
        root.row_variable.value = instruction.children[0]
    elif instruction.data == "cell_operator":
        root.operations.append({"cell_operator": instruction.children[0][0]})
    elif instruction.data == "cell_operator_argument":
        node = class_dictionary[instruction.data]()
        node.value = instruction.children[0][0]
        root.operations[-1]["cell_operator_argument"] = node
    elif instruction.data == "expression":
        node = class_dictionary[instruction.data]()
        if root.expression is None:
            root.expression = node
            for i in instruction.children:
                if isinstance(i, Tree):
                    create_class_tree(i, root.expression)
        else:
            root.expression.append(node)
            for i in instruction.children:
                if isinstance(i, Tree):
                    create_class_tree(i, root.expression[-1])
    elif instruction.data == "expression_string":
        node = class_dictionary["expression"]()
        node.string = instruction.children[0]
        root.expression.append(node)
    elif instruction.data == "and_expression":
        node = class_dictionary[instruction.data]()
        root.and_expression.append(node)
        for i in instruction.children:
            if isinstance(i, Tree):
                create_class_tree(i, root.and_expression[-1])
    elif instruction.data == "or_expression":
        node = class_dictionary[instruction.data]()
        root.or_expression.append(node)
        for i in instruction.children:
            if isinstance(i, Tree):
                create_class_tree(i, root.or_expression[-1])
    elif instruction.data == "operator":
        root.operator = instruction.children[0]
    elif instruction.data == "boolean_expression":
        node = class_dictionary[instruction.data]()
        root.boolean_expression = node
        for i in instruction.children:
            if isinstance(i, Tree):
                create_class_tree(i, root.boolean_expression)
    elif instruction.data == "boolean_equation":
        node = class_dictionary[instruction.data]()
        root.boolean_equation = node
        for i in instruction.children:
            if isinstance(i, Tree):
                create_class_tree(i, root.boolean_equation)
    elif instruction.data == "value_expression":
        node = class_dictionary[instruction.data]()
        root.value_expression = node
        for i in instruction.children:
            if isinstance(i, Tree):
                create_class_tree(i, root.value_expression)
    elif instruction.data == "item_expression":
        node = class_dictionary[instruction.data]()
        root.item_expression = node
        for i in instruction.children:
            if isinstance(i, Tree):
                create_class_tree(i, root.item_expression)


def parse_and_evaluate(text_to_parse: str) -> Union[str, int]:
    """
    This function drives the complete process of evaluation a t2wml expression
    :param text_to_parse:
    :return: result as int or string
    """
    root = generate_tree(text_to_parse)
    result = root.evaluate(bindings)
    return result


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


def parse_evaluate_and_get_cell(text_to_parse: str) -> tuple:
    """
    This function evaluates the expressions and return its value.
    If the expression is not a BooleanEquation, RowExpression or ColumnExpression object the resullt
    is returned along with the cell index it operates on
    :param text_to_parse:
    :return:
    """
    root = generate_tree(text_to_parse)
    if isinstance(root, (BooleanEquation, RowExpression, ColumnExpression)):
        result = root.evaluate(bindings)
    else:
        result = root.evaluate_and_get_cell(bindings)
    return result
