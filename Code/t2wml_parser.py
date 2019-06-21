from lark import Lark
from lark.tree import Tree
from dictionary import class_dictionary
from bindings import bindings
import os
from typing import Union
from ValueExpression import ValueExpression


__CWD__ = os.getcwd()

# instantiate Lark Parser
parser = Lark(open(__CWD__+'\\Code\\grammar.lark'))


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
                create_class_tree(i, root.value_expression)


def parse_and_evaluate(text_to_parse: str) -> Union[str, int]:
    """
    This function drives the complete process of evaluation a t2wml expression
    :param text_to_parse:
    :return: result as int or string
    """
    root = generate_tree(text_to_parse)
    # print(bindings["$row"], bindings["$col"])
    result = root.evaluate(bindings)
    return result


# def main() -> None:
#     """
#     This is the main function. It parses the text based on the prescribed grammar, creates the class tree
#     and then evaluates the expression/equation
#     :return:
#     """
#     # text variable contains the string to be parsed
#     text = """
#         value(value(C/6) = "Females" and value(E/6)-> $col/$row)
#     """
#
#     excel_file_path = __CWD__ + "\\Datasets\\homicide_report_total_and_sex.xlsx"
#     add_excel_file_to_bindings(file_name, "table_1a")
#
#     # The following line will generate an error because currently there's no csv file at this path
#     wikifier_result = __CWD__ + "\\Code\\wikified_excel_file.csv"
#     add_wikifier_result_to_bindings(wikifier_result)
#
#     root = generate_tree(text)
#     result = root.evaluate(bindings)
#     print("Query:", text.strip())
#     print("Result:", result)


# if __name__ == "__main__":
#     main()
