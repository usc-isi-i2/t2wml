from t2wml.spreadsheets.caching import PandasLoader
def get_first_sheet_name(file_path: str):
    """
    This function returns the first sheet name of the excel file
    :param file_path:
    :return:
    """
    pw=PandasLoader(file_path)
    return pw.get_sheet_names()[0]




