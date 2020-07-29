from pathlib import Path
from t2wml.settings import t2wml_settings
from t2wml.spreadsheets.utilities import PandasLoader
from t2wml.spreadsheets.caching import PickleCacher, FakeCacher
from t2wml.spreadsheets.conversions import to_excel
import t2wml.utils.t2wml_exceptions as T2WMLExceptions
from collections.abc import Mapping


def get_cache_class():
    cache_class = FakeCacher
    if t2wml_settings["cache_data_files"]:
        cache_class = PickleCacher
    return cache_class


class SpreadsheetFile(Mapping):
    """ A mapping class (immutable dict) for accessing sheets within a single file.
    All immutable dict methods are available (access by key, iteration, len, etc)
    Keys are sheet names, values are initialized Sheet instances.
    """
    def __init__(self, file_path: str):
        self.file_path = file_path
        self.dict = {}
        pandas_loader = PandasLoader(file_path)
        pandas_data = pandas_loader.load_file()
        for sheet_name in pandas_data:
            self.dict[sheet_name] = Sheet(
                self.file_path, sheet_name, pandas_data[sheet_name])

    @property
    def sheet_names(self):
        return self.dict.keys()

    def __iter__(self):
        return iter(self.dict)

    def __getitem__(self, sheet_name):
        return self.dict[sheet_name]

    def __len__(self):
        return len(self.dict)


class Sheet:
    # all access to spreadsheet goes through here
    def __init__(self, data_file_path: str, sheet_name: str, data=None):
        """[summary]

        Args:
            data_file_path (str): location of sheet file
            sheet_name (str): name of sheet. for csv files, name of sheet file
            data (dataframe, optional): dataframe of contents of sheet. For creating a sheet from already loaded data.
                                        Defaults to None.
        """
        self.data_file_path = data_file_path
        self.data_file_name = Path(data_file_path).name
        self.name = sheet_name

        if data is not None:
            self.data = data
        else:
            cache_class = get_cache_class()
            sc = cache_class(data_file_path, sheet_name)
            self.data = sc.get_sheet()

    def __getitem__(self, params):
        try:
            return self.data.iloc[params]
        except IndexError:
            raise T2WMLExceptions.ValueOutOfBoundException(
                "Cell " + to_excel(params[1], params[0]) + " is outside the bounds of the current data file")

    @property
    def row_len(self):
        return self.data.shape[0]

    @property
    def col_len(self):
        return self.data.shape[1]
