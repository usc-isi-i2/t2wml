from lark import Lark
from lark.lexer import Token
from dictionary import class_dictionary
from bindings import bindings
import os

__CWD__=os.getcwd()

#instantiate Lark Parser
parser = Lark(open(__CWD__+'\\Code\\grammar.lark'))

#this function generates the parse tree and create a tree of class objects and then return its root
def generate_tree(program):
    parse_tree = parser.parse(program)
    root=class_dictionary[parse_tree.children[0].data]()
    for instruction in parse_tree.children[0].children:
        if not isinstance(instruction, Token):
            create_class_tree(instruction,root)
    return root

#this function creates a tree of class objects
def create_class_tree(instruction,root):
    if instruction.data == "cell_expression":
        node=class_dictionary[instruction.data]()
        root.cell_expression=node
        for i in instruction.children:
            if not isinstance(i, Token):
                create_class_tree(i,root.cell_expression)
    elif instruction.data == "column_expression":
        node=class_dictionary[instruction.data]()
        root.column_expression=node
        for i in instruction.children:
            create_class_tree(i,root.column_expression)
    elif instruction.data == "row_expression":
        node=class_dictionary[instruction.data]()
        root.row_expression=node
        for i in instruction.children:
            create_class_tree(i,root.row_expression)
    elif instruction.data == "column_variable":
        node=class_dictionary[instruction.data]()
        root.column_variable=node
        root.column_variable.value=instruction.children[0]
    elif instruction.data == "row_variable":
        node=class_dictionary[instruction.data]()
        root.row_variable=node
        root.row_variable.value=instruction.children[0][0]
    elif instruction.data == "cell_operator":
        root.operations.append({'cell_operator':instruction.children[0][0]})
    elif instruction.data == "cell_operator_argument":
        node=class_dictionary[instruction.data]()
        node.value=instruction.children[0][0]
        root.operations[-1]['cell_operator_argument']=node

def main():
    #text contains the string to be parsed
    text = """
        value($col+2+1/3)
    """
    root=generate_tree(text)
    result=root.evaluate(bindings)
    print("Query:", text.strip())
    print("Result:", result)

if __name__ == "__main__":
    main()