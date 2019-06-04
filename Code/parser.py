from lark import Lark

#instantiate Lark Parser
parser = Lark(open('grammar.lark'))

#this function generates and prints the parse tree
def generate_tree(program):
    parse_tree = parser.parse(program)
    print(parse_tree.pretty())

def main():
    #text contains the string to be parsed
    text = """
        value($col/3-n) = "SDFG" -> value(A/$row)
    """
    generate_tree(text)

if __name__ == "__main__":
    main()