#bindings represents informationnused by classes/functions available in the t2wml parser

class BindingsClass:
    def __init__(self):
        self.item_table=None
        self.excel_sheet=None
        self.sparql_endpoint=None

bindings=BindingsClass()

def update_bindings(item_table, sheet) -> None:
    """
    This function updates the bindings dictionary with the excel_file, item_table, and sparql endpoint
    """
    
    bindings.excel_sheet=sheet
    bindings.item_table = item_table
