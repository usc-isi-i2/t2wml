import os
from pathlib import Path
import logging
from etk.wikidata import serialize_change_record
from t2wml.mapping.cell_mapper import CellMapper
from t2wml.wikification.item_table import ItemTable
from t2wml.mapping.t2wml_handling import generate_download_file, download_kgtk
from t2wml.spreadsheets.utilities import get_first_sheet_name

def run_t2wml(data_file_path: str, wikified_output_path: str, t2wml_spec: str, output_directory: str,
              sheet_name: str = None, filetype: str="ttl", project_name="DriverProject",
              debug=False):
    
    try:
        if not sheet_name:
            sheet_name = get_first_sheet_name(data_file_path)
        file_name = Path(data_file_path).name
        try:
            file_extension = file_name.split(".")[-1]
        except:
            logging.error("Data file has no extension")
            return
    except KeyError as e:
        logging.error("Invalid sheet name:"+str(e))
        return
    except Exception as e:
        logging.error("Invalid data file"+str(e))
        return

    try:
        item_table = ItemTable()
        item_table.update_table_from_wikifier_file(wikified_output_path, data_file_path, sheet_name)
    except Exception as e:
        print(e)
        logging.error("Invalid Wikfied Output File")
        return

    try:
        yc = CellMapper(t2wml_spec, item_table, data_file_path, sheet_name)
    except Exception as e:
        logging.error("Invalid YAML File")
        return

    if filetype in ["ttl", "json"]:
        response = generate_download_file(yc, filetype)
    elif filetype in ["tsv"]:
        response=download_kgtk(yc, project_name, data_file_path, sheet_name)
    else:
        raise ValueError("Unsupported result file type")

    result_directory = '.'.join(file_name.split(".")[:-1])

    output_path = Path()
    if file_extension == "csv":
        output_path = Path(output_directory) / result_directory
    elif file_extension == "xls" or file_extension == "xlsx":
        output_path = Path(output_directory) / result_directory / sheet_name

    Path.mkdir(output_path, parents=True, exist_ok=True)

    output_file_name="results."+filetype

    with open(str(output_path / output_file_name), "w") as fp:
        fp.write(response["data"])

    with open(str(output_path / "changes.tsv"), "w") as fp:
        serialize_change_record(fp)
    

