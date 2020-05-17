#bindings represents informationnused by classes/functions available in the t2wml parser

class BindingsClass:
    def __init__(self):
        self.item_table=None
        self.excel_sheet=None
        self.sparql_endpoint=None
    

bindings=BindingsClass()

def update_bindings(sheet=None, item_table=None, sparql_endpoint=None) -> None:
    """
    This function updates the bindings dictionary with the excel_file, item_table, and sparql endpoint
    """
    if sheet:
        bindings.excel_sheet=sheet
    if item_table:
        bindings.item_table = item_table
    if sparql_endpoint:
        bindings.sparql_endpoint = sparql_endpoint
