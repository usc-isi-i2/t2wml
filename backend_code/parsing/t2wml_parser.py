from backend_code import t2wml_exceptions as T2WMLExceptions
from backend_code.bindings import bindings

from backend_code.parsing.constants import char_dict
from backend_code.parsing.functions import functions_dict
eval_globals=dict()
eval_globals.update(char_dict)
eval_globals.update(functions_dict)

import pandas

class ItemExpression:
    def __getitem__(self, args):
        item_table=bindings["item_table"]
        if len(args)<3:
            args=list(args)
            args.append('__NO_CONTEXT__')
        return item_table.get_item(*args)

class CellRange:
    def __init__(self, df):
        self.df=df
    def __eq__(self, comparator):
        for i in self.df:
            if i!=comparator:
                return False
        return True

class CellExpression:
    def __getitem__(self, item):
        data_sheet=bindings["excel_sheet"]
        df=pandas.DataFrame(data_sheet)

        row_args=item[1]
        col_args=item[0]
        try:
            return CellRange(df.iloc[row_args, col_args])
        except Exception as e:
            print("heres the error")
            raise e


def parse_expression(e_str, context={}):
    e_str=str(e_str)
    value = CellExpression()
    item=ItemExpression()
    globals = dict(value=value, item=item)
    globals.update(eval_globals)
    globals.update(context)
    e_str= e_str.replace("$", "")
    e_str = e_str.replace("/", ",")
    e_str = e_str.replace("=", "==")
    e_str = e_str.replace("->", "and")
    try:
        result = eval(e_str, globals)
        return result
    except Exception as e:
        print("error in", e_str)
        raise e

def iter_on_variables(expression, upper_limit, context={}):
    for n in range(upper_limit):
        try:
            context.update({"n":n})
            return_value= parse_expression(expression, context)
            if return_value:
                return return_value
        except IndexError:
            break

        
