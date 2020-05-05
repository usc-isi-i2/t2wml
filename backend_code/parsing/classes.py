from backend_code.bindings import bindings
from backend_code.spreadsheets.conversions import to_excel

def index_converter(arg):
    try:
        if isinstance(arg, slice):
            return slice(arg.start-1, arg.stop, arg.step)
        return arg-1
    except Exception as e:
        raise e


class ReturnClass:
    def __init__(self, col, row, value=None):
        self.col=col
        self.row=row
        self.value=value #usually overwritten in children
    
    def __eq__(self, comparator):
        if self.value==comparator:
            return True
        try:
            if self.value==comparator.value:
                return True
        except:
            pass
        return False
    
    def __str__(self):
        return str(self.value)
    
    def __bool__(self):
        return bool(self.value)
    
    def __repr__(self):
        return to_excel(self.col, self.row)+ " : "+str(self.value)


class Item(ReturnClass):
    def __init__(self, col, row, context):
        super().__init__(col, row)
        item_table=bindings.item_table
        self.value=item_table.get_item(self.col, self.row, context)


class ItemExpression:
    def __getitem__(self, args):
        try:
            context=args[2]
        except:
            context='__NO_CONTEXT__'
        col=index_converter(args[0])
        row=index_converter(args[1])
        return Item(col, row, context)

class Cell(ReturnClass):
    def __init__(self, col, row):
        super().__init__(col, row)
        data_sheet=bindings.excel_sheet
        self.value=data_sheet[row][col]
    

class CellRange:
    def __init__(self, col_args, row_args):
        data_sheet=bindings.excel_sheet
        self.col_args = col_args
        self.row_args = row_args
        rows_area = data_sheet[row_args]
        if isinstance(row_args, int):
            rows_area=[rows_area]

        area=[]
        for row in rows_area:
            new_row=row[col_args]
            area.append(new_row)

        self.area = area
        self.row_length=len(self.area[0])

    @property
    def flattened_area(self):
        for row in self.area:
            for col in row:
                yield col

    def __eq__(self, comparator):
        for i in self.flattened_area:
            if i != comparator:
                return False
        return True

    def __repr__(self):
        return str(self.area)

    def __iter__(self):
        for i in self.flattened_area:
            yield i

    def __setitem__(self, flat_index, data):
        row=flat_index//self.row_length
        col=flat_index%self.row_length
        self.area[row][col]=data

    def __getitem__(self, flat_index):
        row=flat_index//self.row_length
        col=flat_index%self.row_length
        return self.area[row][col]


class CellExpression:
    def __getitem__(self, item):
        col=index_converter(item[0])
        row=index_converter(item[1])
        if isinstance(col, int) and isinstance(row, int):
            return Cell(col, row)
        return CellRange(col, row)

