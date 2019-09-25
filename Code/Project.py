from time import time
import json
from typing import Sequence
from oslo_concurrency import lockutils
from pathlib import Path
import Code.utility_functions as uf


class Project:
	def __init__(self, file_path):
		self.file_path = file_path
		self.__project_config = self.read_project_config()
		self.update_mdate()

	def read_project_config(self) -> dict:
		"""
		This function reads the project config.json and returns the deserialized version
		:return:
		"""
		with open(self.file_path) as pconfig:
			data = pconfig.read()
			json_data = json.loads(data)
			return json_data

	def update_project_config(self, new_config: dict = None) -> None:
		"""
		This function updates the project_config.json by locking the file
		:param new_config:
		:return:
		"""
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
		def write_file() -> None:
			"""
			This function writes the file
			:return:
			"""
			with open(self.file_path, "w") as pconfig:
				json.dump(self.__project_config, pconfig, indent=3)

		write_file()

	def update_mdate(self) -> None:
		"""
		This function updates the modified date attribute of the project
		:return:
		"""
		self.__project_config['mdate'] = int(time() * 1000)
		self.update_project_config()

	def get_current_file_and_sheet(self) -> Sequence[str]:
		"""
		This function returns the current data file name(backend name and not actual name) and the current sheet name
		In case of csv files, sheet name = file name
		:return:
		"""
		return self.__project_config["currentDataFile"], self.__project_config["currentSheetName"]

	def get_file_name_by_id(self, file_id: str) -> str:
		"""
		This function returns the actual file name of the data file associated with the file_id
		:param file_id:
		:return:
		"""
		return self.__project_config["dataFileMapping"][file_id]

	def get_or_create_wikifier_region_filename(self, file_name: str = None, sheet_name: str = None) -> str:
		"""
		This function fetches or creates the wikifier config file and return its name.
		:param file_name:
		:param sheet_name:
		:return:
		"""
		if not file_name and not sheet_name:
			file_name, sheet_name = self.get_current_file_and_sheet()
		try:
			if file_name[-3:].lower() == "csv":
				region_file_name = self.__project_config["wikifierRegionMapping"][file_name][file_name]
			else:
				region_file_name = self.__project_config["wikifierRegionMapping"][file_name][sheet_name]
		except KeyError:
			region_file_name = uf.generate_id() + ".json"
			if file_name not in self.__project_config["wikifierRegionMapping"]:
				self.__project_config["wikifierRegionMapping"][file_name] = dict()
			if file_name[-3:].lower() == "csv":
				self.__project_config["wikifierRegionMapping"][file_name].update({file_name: region_file_name})
			else:
				self.__project_config["wikifierRegionMapping"][file_name].update({sheet_name: region_file_name})
			self.update_project_config()
		return region_file_name

	def get_wikifier_region_filename(self) -> str:
		"""
		This function returns the wikifier config file name associated with the current file and sheet.
		:return:
		"""
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

	def add_yaml_file(self, data_file_name: str, sheet_name: str, yaml_file_name: str) -> None:
		"""
		This function associates a yaml file with a sheet of a data file
		:param data_file_name:
		:param sheet_name:
		:param yaml_file_name:
		:return:
		"""
		if data_file_name not in self.__project_config["yamlMapping"]:
			self.__project_config["yamlMapping"][data_file_name] = dict()

		self.__project_config["yamlMapping"][data_file_name][sheet_name] = yaml_file_name
		self.update_project_config()

	def get_yaml_file_id(self, data_file_name: str, sheet_name: str) -> str:
		"""
		This function fetches the yaml file name associated with a sheet of a data file
		:param data_file_name:
		:param sheet_name:
		:return:
		"""
		try:
			yaml_file_id = self.__project_config["yamlMapping"][data_file_name][sheet_name]
		except KeyError:
			yaml_file_id = None
		return yaml_file_id

	def get_sparql_endpoint(self) -> str:
		"""
		This function fetches the sparql endpoint of a project (self)
		:return:
		"""
		return self.__project_config["sparqlEndpoint"]

	def update_sparql_endpoint(self, sparql_endpoint: str) -> None:
		"""
		This function updates the sparql endpoint of the project (self)
		:param sparql_endpoint:
		:return:
		"""
		self.__project_config["sparqlEndpoint"] = sparql_endpoint
		self.update_project_config()

	def update_project_title(self, ptitle: str) -> None:
		"""
		This function updates the project title of the project (self)
		:param ptitle:
		:return:
		"""
		self.__project_config["ptitle"] = ptitle
		self.update_project_config()