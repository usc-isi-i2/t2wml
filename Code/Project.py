from datetime import datetime
from Code.DataFileStore import DataFileStore
from Code.YAMLFile import YAMLData
from Code.DataFile import DataFile
from Code.utility_functions import excel_to_json


class Project:
	def __init__(self):
		self.__id = None
		self.__title = None
		self.__sparql_endpoint = "http://sitaware.isi.edu:8080/bigdata/namespace/wdq/sparql"
		self.__yaml_files = YAMLData()
		self.__data_files = DataFileStore()
		self.__current_data_file_id = None
		self.__creation_time_stamp = int(datetime.timestamp(datetime.utcnow()) * 1000)
		self.__last_modified_time_stamp = int(datetime.timestamp(datetime.utcnow()) * 1000)

	def get_project_details(self) -> dict:
		details = dict()
		details['pid'] = self.__id
		details['ptitle'] = self.__title
		details['cdate'] = self.__creation_time_stamp
		details['mdate'] = self.__last_modified_time_stamp
		return details

	def set_id(self, project_id):
		self.__id = project_id

	def set_title(self, project_title):
		self.__title = project_title

	def get_sparql_endpoint(self) -> str:
		return self.__sparql_endpoint

	def set_sparql_endpoint(self, new_sparql_endpoint: str) -> None:
		self.__sparql_endpoint = new_sparql_endpoint

	def get_yaml_data(self):
		return self.__yaml_data

	def set_yaml_date(self, yaml_data: YAMLData):
		self.__yaml_data = yaml_data

	def get_data_file_by_id(self, file_id: str) -> DataFile:
		return self.__data_files.get_data_file_by_id(file_id)

	def set_current_data_file_id(self, file_id: str) -> None:
		self.__current_data_file_id = file_id

	def get_current_data_file_id(self) -> str:
		return self.__current_data_file_id

	def get_current_data_file(self) -> DataFile:
		return self.get_data_file_by_id(self.__current_data_file_id)

	def index_data_file(self, data_file: DataFile) -> None:
		self.__data_files.index_data_file(data_file)

	def get_current_data_file_contents(self):
		data_file = self.get_current_data_file()
		if data_file:
			file_path = data_file.get_file_location()
			sheet_name = data_file.get_sheet_name()
			file_content = excel_to_json(file_path, sheet_name, ignore_sheet_names=False)
		else:
			file_content = None
		return file_content

	def get_wikified_regions_of_current_data_file(self):
		data_file = self.get_current_data_file()
		if data_file:
			region_qnodes = data_file.get_region_qnodes()
		else:
			region_qnodes = None
		return region_qnodes

	def reset(self, attribute: str = None) -> None:
		if attribute == 'yaml':
			self.__yaml_data.reset()
