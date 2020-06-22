from t2wml_api.utils import t2wml_exceptions as T2WMLExceptions
from t2wml_api.utils.bindings import bindings
from t2wml_api.parsing.classes import (CellExpression, ItemExpression,
                                          ReturnClass)
from t2wml_api.parsing.constants import char_dict
from t2wml_api.parsing.functions import functions_dict

eval_globals=dict()
eval_globals.update(char_dict)
eval_globals.update(functions_dict)

class T2WMLCode:
    def __init__(self, code, original_str):
        self.code=code
        self.has_n="t_var_n" in original_str
        self.original_str=original_str


def t2wml_parse(e_str, context={}):
    value = CellExpression()
    item=ItemExpression()
    globals = dict(value=value, item=item)
    globals.update(eval_globals)
    globals.update(context)
    result = eval(e_str, globals)
    return result


def iter_on_n(expression, context={}, upper_limit=None):
    #handle iter on variable n. if there is no variable n this will anyway return in first iteration
    if upper_limit is None:
        upper_limit= max(len(bindings.excel_sheet), len(bindings.excel_sheet[0]))
    for n in range(0, upper_limit):
        try:
            context_dir={"t_var_n":n}
            context_dir.update(context)
            return_value= t2wml_parse(expression, context_dir)
            if return_value:
                return return_value
            #else:
            #    print(n)
        except IndexError:
            break

def iter_on_n_for_code(input, context={}):
    if isinstance(input, str):
        return ReturnClass(None, None, input)
    if isinstance(input, T2WMLCode):
        if input.has_n:
            return iter_on_n(input.code, context)
        return t2wml_parse(input.code, context)
    return t2wml_parse(input, context)
