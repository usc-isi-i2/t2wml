from backend_code import t2wml_exceptions as T2WMLExceptions
from backend_code.bindings import bindings
from backend_code.parsing.classes import (CellExpression, ItemExpression,
                                          ReturnClass)
from backend_code.parsing.constants import char_dict
from backend_code.parsing.functions import functions_dict

eval_globals=dict()
eval_globals.update(char_dict)
eval_globals.update(functions_dict)


def t2wml_parse(e_str, context={}):
    value = CellExpression()
    item=ItemExpression()
    globals = dict(value=value, item=item)
    globals.update(eval_globals)
    globals.update(context)
    try:
        result = eval(e_str, globals)
        return result
    except Exception as e:
        print("error in", e_str, ":", str(e))
        raise e

def iter_on_n(expression, context={}):
    #handle iter on variable n. if there is no variable n this will anyway return in first iteration
    upper_limit= max(len(bindings.excel_sheet), len(bindings.excel_sheet[0]))
    for n in range(0, upper_limit):
        try:
            context_dir={"n":n}
            context_dir.update(context)
            return_value= t2wml_parse(expression, context_dir)
            if return_value:
                return return_value
        except IndexError:
            break

def iter_on_n_for_code(input, context={}):
    if isinstance(input, str):
        return ReturnClass(None, None, input)
    return iter_on_n(input, context)
