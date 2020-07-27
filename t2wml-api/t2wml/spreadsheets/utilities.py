from pathlib import Path
import pandas as pd


class PandasLoader:
    # a wrapper to centralize and make uniform any loading of data files/sheets from pandas
    def __init__(self, file_path):
        self.file_path = file_path
        file_extension = Path(file_path).suffix
        self.is_csv = True if file_extension.lower() == ".csv" else False
        self.pd_args = dict(dtype=object, header=None)

    def post_process_data(self, data):
        data = data.fillna("")
        data = data.replace(r'^\s+$', "", regex=True)
        return data

    def load_sheet(self, sheet_name):
        """
        returns a single sheet's data frame
        """
        if self.is_csv:
            data = pd.read_csv(self.file_path, **self.pd_args)
        else:
            data = pd.read_excel(
                self.file_path, sheet_name=sheet_name, **self.pd_args)
        return self.post_process_data(data)

    def load_file(self):
        """
        returns a dictionary of sheet_names and their data frames
        """
        if self.is_csv:
            data = pd.read_csv(self.file_path, **self.pd_args)
            data = self.post_process_data(data)
            sheet_name = Path(self.file_path).name
            return {sheet_name: data}
        else:
            return_dict = {}
            loaded_file = pd.read_excel(
                self.file_path, sheet_name=None, **self.pd_args)
            for sheet_name in loaded_file:
                data = loaded_file[sheet_name]
                data = self.post_process_data(data)
                return_dict[sheet_name] = data
            return return_dict

    def get_sheet_names(self):
        if self.is_csv:
            return [Path(self.file_path).name]
        else:
            xl = pd.ExcelFile(self.file_path)
            return xl.sheet_names

    def load_pickle(self, pickle_path):
        data = pd.read_pickle(pickle_path)
        return self.post_process_data(data)


def get_first_sheet_name(file_path: str):
    """
    This function returns the first sheet name of the excel file
    :param file_path:
    :return:
    """
    pw = PandasLoader(file_path)
    return pw.get_sheet_names()[0]
