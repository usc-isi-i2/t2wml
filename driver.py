from Code.ItemTable import ItemTable
from Code.handler import build_item_table, generate_download_file, load_yaml_data
from Code.YAMLFile import YAMLFile
from pathlib import Path
from etk.wikidata import serialize_change_record
from Code.utility_functions import get_first_sheet_name
import logging


def run_t2wml(data_file_path: str,  wikified_output_path: str, t2wml_spec: str, output_directory: str, sheet_name: str = None, sparql_endpoint: str = "http://dsbox02.isi.edu:8888/bigdata/namespace/wdq/sparql"):
	try:
		yaml_configuration = YAMLFile()
		yaml_configuration.set_file_location(t2wml_spec)
		region, template = load_yaml_data(t2wml_spec)
		yaml_configuration.set_region(region)
		yaml_configuration.set_template(template)
	except:
		logging.error("Invalid YAML File")
		return

	try:
		item_table = ItemTable()
		build_item_table(item_table, wikified_output_path, data_file_path, sheet_name)
	except:
		logging.error("Invalid Wikfied Output File")
		return

	filetype = "ttl"

	response = generate_download_file(None, item_table, data_file_path, sheet_name, region, template, filetype, sparql_endpoint)
	print(response)
	file_name = Path(data_file_path).name
	result_directory = file_name.split(".")[0]
	try:
		file_extension = file_name.split(".")[1]
	except:
		logging.error("Data file has no extension")
		return

	output_path = Path()

	if file_extension == ".csv":
		output_path = Path(output_directory)/result_directory
	elif file_extension == ".xls" or file_extension == "xlsx":
		if not sheet_name:
			sheet_name = get_first_sheet_name(data_file_path)
		output_path = Path(output_directory)/result_directory / sheet_name

	Path.mkdir(output_path, parents=True, exist_ok=True)

	with open(str(output_path / "results.ttl"), "w") as fp:
		fp.write(response["data"])

	with open(str(output_path / "changes.tsv"), "w") as fp:
		serialize_change_record(fp)

run_t2wml("Datasets\\WDI_scripts_data\\data\\AG.AGR.TRAC.NO\\API_AG.AGR.TRAC.NO_DS2_EN_csv_v2_202383.csv", "Datasets\\WDI_scripts_data\\wikifier.csv", "Datasets\\WDI_scripts_data\\template.yaml", "C:\\Users\\divij\\Desktop\\New folder (2)")