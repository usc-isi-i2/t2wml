from Code.ItemTable import ItemTable
from Code.handler import generate_download_file, load_yaml_data, process_wikified_output_file
from Code.YAMLFile import YAMLFile
from pathlib import Path
from etk.wikidata import serialize_change_record
from Code.utility_functions import get_first_sheet_name, add_row_in_data_file, delete_file
import logging
from app_config import DEFAULT_SPARQL_ENDPOINT


def run_t2wml(data_file_path: str, wikified_output_path: str, t2wml_spec: str, output_directory: str,
              sheet_name: str = None,
              sparql_endpoint: str = DEFAULT_SPARQL_ENDPOINT, debug=False):
    try:
        if not sheet_name:
            sheet_name = get_first_sheet_name(data_file_path)
        file_name = Path(data_file_path).name
        try:
            file_extension = file_name.split(".")[-1]
        except:
            logging.error("Data file has no extension")
            return
        new_file_path = str(Path.cwd() / 'temporary_files' / file_name)
        add_row_in_data_file(data_file_path, sheet_name, new_file_path)
    except KeyError:
        logging.error("Invalid sheet name")
        return
    except Exception:
        logging.error("Invalid data file")
        return

    try:
        item_table = ItemTable()
        process_wikified_output_file(wikified_output_path, item_table, new_file_path, sheet_name)
    except Exception as e:
        print(e)
        logging.error("Invalid Wikfied Output File")
        return

    try:
        yaml_configuration = YAMLFile()
        yaml_configuration.set_file_location(t2wml_spec)
        region, template, created_by = load_yaml_data(t2wml_spec, item_table, new_file_path, sheet_name)
        yaml_configuration.set_region(region)
        yaml_configuration.set_template(template)
    except Exception as e:
        logging.error("Invalid YAML File")
        return

    filetype = "ttl"

    response = generate_download_file(None, item_table, new_file_path, sheet_name, region, template, filetype,
                                      sparql_endpoint, created_by=created_by, debug=debug)
    result_directory = '.'.join(file_name.split(".")[:-1])

    output_path = Path()
    if file_extension == "csv":
        output_path = Path(output_directory) / result_directory
    elif file_extension == "xls" or file_extension == "xlsx":
        output_path = Path(output_directory) / result_directory / sheet_name

    Path.mkdir(output_path, parents=True, exist_ok=True)

    with open(str(output_path / "results.ttl"), "w") as fp:
        fp.write(response["data"])

    with open(str(output_path / "changes.tsv"), "w") as fp:
        serialize_change_record(fp)

    delete_file(new_file_path)
