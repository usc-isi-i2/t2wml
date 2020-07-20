import os
from pathlib import Path
import logging
from t2wml.api import create_output_from_files
from t2wml.spreadsheets.utilities import get_first_sheet_name

def run_t2wml(data_file_path: str, wikified_output_path: str, t2wml_spec: str, output_directory: str,
              sheet_name: str = None, filetype: str="ttl",
              debug=False):
    

    if not sheet_name:
        sheet_name = get_first_sheet_name(data_file_path)

    result_directory = '.'.join(data_file_path.split(".")[:-1])

    output_path = Path(output_directory) / result_directory / sheet_name

    Path.mkdir(output_path, parents=True, exist_ok=True)

    output_file_name="results."+filetype

    response=create_output_from_files(data_file_path, sheet_name, t2wml_spec, wikified_output_path, output_format=filetype)

    with open(str(output_path / output_file_name), "w") as fp:
        fp.write(response)

    

