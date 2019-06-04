from lark import Lark

#instantiate Lark Parser
parser = Lark(open('grammar.lark'))

def generate_tree(program):
    parse_tree = parser.parse(program)
    print(parse_tree.pretty())

def main():
    text = """
        value($col/3-n) = "SDFG" -> value(A/$row)
    """
    generate_tree(text)

if __name__ == "__main__":
    main()