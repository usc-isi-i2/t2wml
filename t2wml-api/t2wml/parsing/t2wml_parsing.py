from t2wml.utils.bindings import bindings
from t2wml.parsing.classes import (CellExpression, ItemExpression,
                                   ReturnClass)
from t2wml.parsing.constants import char_dict
from t2wml.parsing.functions import functions_dict

eval_globals = dict()
eval_globals.update(char_dict)
eval_globals.update(functions_dict)


class T2WMLCode:
    def __init__(self, code, code_str, unmodified_str):
        '''
        code: the compiled eval expression
        code_str: the string sent to be compiled (used to init some variables)
        unmodified_str: the user's original string (used for error messages)
        '''
        self.code = code
        self.has_n = "t_var_n" in code_str
        self.sheet_dependent = "t_var_sheet" in code_str
        self.is_variable = "t_var" in code_str
        self.code_str = code_str
        self.unmodified_str = unmodified_str


def t2wml_parse(e_str, context={}):
    value = CellExpression()
    item = ItemExpression()
    globals = dict(value=value, item=item)
    globals.update(eval_globals)
    globals.update(context)
    result = eval(e_str, globals)
    return result


def iter_on_n(expression, context={}, upper_limit=None):
    # handle iter on variable n. if there is no variable n this will anyway return in first iteration
    if upper_limit is None:
        upper_limit = max(bindings.excel_sheet.row_len,
                          bindings.excel_sheet.col_len)
    for n in range(0, upper_limit):
        try:
            context_dir = {"t_var_n": n}
            context_dir.update(context)
            return_value = t2wml_parse(expression, context_dir)
            if return_value:
                return return_value
            # else:
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
