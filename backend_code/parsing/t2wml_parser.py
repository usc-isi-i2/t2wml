from backend_code import t2wml_exceptions as T2WMLExceptions
from backend_code.bindings import bindings
from backend_code.spreadsheets.conversions import cell_tuple_to_str
from backend_code.spreadsheets.utilities import get_cell_value
from backend_code.parsing.constants import char_dict
from backend_code.parsing.functions import functions_dict
eval_globals=dict()
eval_globals.update(char_dict)
eval_globals.update(functions_dict)

import pandas


class ItemReturn:
    def __init__(self, args):
        item_table=bindings["item_table"]
        if len(args)<3:
            args=list(args)
            args.append('__NO_CONTEXT__')
        self.col=args[0]
        self.row=args[1]-1 #convert 1 indexed to 0 indexed
        self.value=item_table.get_item(self.col, self.row, args[2])

    def __eq__(self, comparator):
        if self.value==comparator:
            return True
        try:
            if self.value==comparator.value:
                return True
        except:
            pass
        return False
    
    def __repr__(self):
        return cell_tuple_to_str(self.col, self.row)+ " : "+str(self.value)

class ItemExpression:
    def __getitem__(self, args):
        return ItemReturn(args)


class Cell:
    def __init__(self, col, row):
        self.col=col
        self.row=row-1 #convert 1 indexed to 0 indexed
        self.value=get_cell_value(bindings, self.row, self.col)
    
    def __eq__(self, comparator):
        return self.value==comparator
    
    def __repr__(self):
        return cell_tuple_to_str(self.col, self.row)+ " : "+str(self.value)


class CellRange:
    def __init__(self, item):
        data_sheet=bindings["excel_sheet"]
        df=pandas.DataFrame(data_sheet)
        self.col=item[0] #converted by the dictionary to the correct value
        self.row=item[1]-1 #convert 1 indexed to 0 indexed
        area=df.iloc[self.row, self.col]
        self.df=area


    def __eq__(self, comparator):
        for i in self.df:
            if i!=comparator:
                return False
        return True
    
    def __repr__(self):
        return str(self.df)

class CellExpression:
    def __getitem__(self, item):
        if isinstance(item[0], int) and isinstance(item[1], int):
            return Cell(item[0], item[1])
        return CellRange(item)



def parse_expression(e_str, context={}):
    print(context)
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
        print(e_str, ":\t", result)
        return result
    except Exception as e:
        print("error in", e_str)
        raise e

def iter_on_n(expression, context={}):
    #handle iter on variable n. if there is no variable n this will anyway return in first iteration
    upper_limit= max(len(bindings["excel_sheet"]), len(bindings["excel_sheet"][0]))
    for n in range(1, upper_limit):
        try:
            context_dir={"n":n}
            context_dir.update(context)
            return_value= parse_expression(expression, context_dir)
            if return_value:
                return return_value
        except IndexError:
            break

        
