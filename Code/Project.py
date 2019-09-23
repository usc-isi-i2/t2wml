from time import time
from Code.DataFileStore import DataFileStore
from Code.YAMLFile import YAMLFile
from Code.DataFile import DataFile
from Code.YAMLFileStore import YAMLFileStore
from Code.utility_functions import generate_id
import json
from oslo_concurrency import lockutils
from pathlib import Path


class Project:
	def __init__(self, file_path):
		self.file_path = file_path
		self.__project_config = self.read_project_config()

	def read_project_config(self):
		with open(self.file_path) as pconfig:
			data = pconfig.read()
			json_data = json.loads(data)
			return json_data

	def update_project_config(self, new_config: dict = None):
		if new_config:
			for k in new_config.keys():
				if k == "dataFileMapping":
					self.__project_config[k].update(new_config[k])
				elif k == "wikifierRegionMapping" or k == "yamlMapping":
					for key in new_config[k].keys():
						if key not in self.__project_config[k]:
							self.__project_config[k][key] = dict()
						self.__project_config[k][key].update(new_config[k][key])
				else:
					self.__project_config[k] = new_config[k]

		@lockutils.synchronized('update_project_config', fair=True, external=True, lock_path=Path(self.file_path).parents[0])
		def write_file():
			with open(self.file_path, "w") as pconfig:
				json.dump(self.__project_config, pconfig, indent=3)

		write_file()

	def update_mdate(self):
		self.__project_config['mdate'] = int(time() * 1000)
		self.update_project_config()

	def get_current_file_and_sheet(self):
		return self.__project_config["currentDataFile"], self.__project_config["currentSheetName"]

	def get_file_name_by_id(self, file_id):
		return self.__project_config["dataFileMapping"][file_id]

	def get_or_create_wikifier_region_filename(self, file_name=None, sheet_name=None):
		if not file_name and not sheet_name:
			file_name, sheet_name = self.get_current_file_and_sheet()
		try:
			if file_name[-3:].lower() == "csv":
				region_file_name = self.__project_config["wikifierRegionMapping"][file_name][file_name]
			else:
				region_file_name = self.__project_config["wikifierRegionMapping"][file_name][sheet_name]
		except KeyError:
			region_file_name = generate_id() + ".json"
			if file_name not in self.__project_config["wikifierRegionMapping"]:
				self.__project_config["wikifierRegionMapping"][file_name] = dict()
			if file_name[-3:].lower() == "csv":
				self.__project_config["wikifierRegionMapping"][file_name].update({file_name: region_file_name})
			else:
				self.__project_config["wikifierRegionMapping"][file_name].update({sheet_name: region_file_name})
			self.update_project_config()
		return region_file_name

	def get_wikifier_region_filename(self):
		file_name, sheet_name = self.get_current_file_and_sheet()
		if file_name:
			try:
				if file_name[-3:].lower() == "csv":
					region_file_name = self.__project_config["wikifierRegionMapping"][file_name][file_name]
				else:
					region_file_name = self.__project_config["wikifierRegionMapping"][file_name][sheet_name]
			except KeyError:
				region_file_name = None
		else:
			region_file_name = None
		return region_file_name

	def add_yaml_file(self, data_file_name, sheet_name, yaml_file_name):
		if data_file_name not in self.__project_config["yamlMapping"]:
			self.__project_config["yamlMapping"][data_file_name] = dict()

		self.__project_config["yamlMapping"][data_file_name][sheet_name] = yaml_file_name
		self.update_project_config()

	def get_yaml_file_id(self, data_file_name, sheet_name):
		try:
			yaml_file_id = self.__project_config["yamlMapping"][data_file_name][sheet_name]
		except KeyError:
			yaml_file_id = None
		return yaml_file_id

	def get_sparql_endpoint(self):
		return self.__project_config["sparqlEndpoint"]

	def update_sparql_endpoint(self, sparql_endpoint):
		self.__project_config["sparqlEndpoint"] = sparql_endpoint
		self.update_project_config()

	def update_project_title(self, ptitle):
		self.__project_config["ptitle"] = ptitle
		self.update_project_config()
# 	self.__id = None
	# 	self.__title = None
	# 	self.__sparql_endpoint = "http://sitaware.isi.edu:8080/bigdata/namespace/wdq/sparql"
	# 	self.__yaml_file_store = YAMLFileStore()
	# 	self.__data_files = DataFileStore()
	# 	self.__current_data_file_id = None
	# 	self.__creation_time_stamp = int(time() * 1000)
	# 	self.__last_modified_time_stamp = int(time() * 1000)
	#
	# def get_project_details(self) -> dict:
	# 	details = dict()
	# 	details['pid'] = self.__id
	# 	details['ptitle'] = self.__title
	# 	details['cdate'] = self.__creation_time_stamp
	# 	details['mdate'] = self.__last_modified_time_stamp
	# 	return details
	#
	# def set_id(self, project_id):
	# 	self.__id = project_id
	#
	# def set_title(self, project_title):
	# 	self.__title = project_title
	#
	# def get_sparql_endpoint(self) -> str:
	# 	return self.__sparql_endpoint
	#
	# def set_sparql_endpoint(self, new_sparql_endpoint: str) -> None:
	# 	self.__sparql_endpoint = new_sparql_endpoint
	#
	# def get_yaml_data(self):
	# 	return self.__yaml_data
	#
	# def set_yaml_date(self, yaml_data: YAMLFile):
	# 	self.__yaml_data = yaml_data
	#
	# def get_data_file_by_id(self, file_id: str) -> DataFile:
	# 	return self.__data_files.get_data_file_by_id(file_id)
	#
	# def set_current_data_file_id(self, file_id: str) -> None:
	# 	self.__current_data_file_id = file_id
	#
	# def get_current_data_file_id(self) -> str:
	# 	return self.__current_data_file_id
	#
	# def get_current_data_file(self) -> DataFile:
	# 	return self.get_data_file_by_id(self.__current_data_file_id)
	#
	# def index_data_file(self, data_file: DataFile) -> None:
	# 	self.__data_files.index_data_file(data_file)
	#
	# def get_current_data_file_contents(self):
	# 	data_file = self.get_current_data_file()
	# 	if data_file:
	# 		file_path = data_file.get_file_location()
	# 		sheet_name = data_file.get_sheet_name()
	# 		file_content = excel_to_json(file_path, sheet_name, ignore_sheet_names=False)
	# 	else:
	# 		file_content = None
	# 	return file_content
	#
	# def get_wikified_regions_of_current_data_file(self):
	# 	data_file = self.get_current_data_file()
	# 	if data_file:
	# 		region_qnodes = data_file.get_region_qnodes()
	# 	else:
	# 		region_qnodes = None
	# 	return region_qnodes
	#
	# def get_yaml_file_of_current_data_file(self):
	# 	data_file = self.get_current_data_file()
	# 	if data_file:
	# 		data_file_id = data_file.get_id()
	# 		sheet_name = data_file.get_sheet_name()
	# 		yaml_file = self.__yaml_file_store.get_yaml_file_of_sheet(data_file_id, sheet_name)
	# 	else:
	# 		yaml_file = None
	# 	return yaml_file
	#
	# def reset(self, attribute: str = None) -> None:
	# 	if attribute == 'yaml':
	# 		self.__yaml_data.reset()
