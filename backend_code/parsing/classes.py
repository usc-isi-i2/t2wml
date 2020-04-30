from backend_code.bindings import bindings
from backend_code.spreadsheets.conversions import to_excel

def index_converter(arg):
    try:
        if isinstance(arg, slice):
            return slice(arg.start-1, arg.stop-1, arg.step)
        return arg-1
    except Exception as e:
        raise e

class ItemReturn:
    def __init__(self, col, row, context):
        item_table=bindings.item_table
        self.col=col
        self.row=row
        self.value=item_table.get_item(self.col, self.row, context)

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
        return to_excel(self.col, self.row)+ " : "+str(self.value)
    
    def __str__(self):
        return str(self.value)
    
    def __bool__(self):
        return bool(self.value)

class ItemExpression:
    def __getitem__(self, args):
        try:
            context=args[2]
        except:
            context='__NO_CONTEXT__'
        col=index_converter(args[0])
        row=index_converter(args[1])
        return ItemReturn(col, row, context)

class Cell:
    def __init__(self, col, row):
        data_sheet=bindings.excel_sheet
        self.col=col
        self.row=row
        self.value=data_sheet[row][col]
    
    def __eq__(self, comparator):
        return self.value==comparator
    
    def __repr__(self):
        return to_excel(self.col, self.row)+ " : "+str(self.value)
    
    def __str__(self):
        return str(self.value)
    
    def __bool__(self):
        return bool(self.value)

class CellRange:
    def __init__(self, col_args, row_args):
        data_sheet=bindings.excel_sheet
        self.col_args=col_args
        self.row_args=row_args
        area=data_sheet[row_args][col_args]
        if isinstance(row_args, slice):
            area=[y for x in area for y in x]
        self.area=area
    def __eq__(self, comparator):
        for i in self.area:
            if i!=comparator:
                return False
        return True
    
    def __repr__(self):
        return str(self.area)

class CellExpression:
    def __getitem__(self, item):
        col=index_converter(item[0])
        row=index_converter(item[1])
        if isinstance(col, int) and isinstance(row, int):
            return Cell(col, row)
        return CellRange(col, row)

