from datetime import datetime
from Code.DataFileStore import DataFileStore
from Code.YAMLData import YAMLData
from Code.DataFile import DataFile


class Project:
	def __init__(self):
		self.__id = None
		self.__title = None
		self.__sparql_endpoint = "https://query.wikidata.org/sparql"
		self.__yaml_data = YAMLData()
		self.__data_files = DataFileStore()
		self.__current_data_file_id = None
		self.__creation_time_stamp = datetime.utcnow()
		self.__last_modified_time_stamp = datetime.utcnow()

	def get_project_details(self) -> dict:
		details = dict()
		details['project_id'] = self.__id
		details['project_title'] = self.__title
		details['creation_time_stamp'] = self.__creation_time_stamp
		details['last_modified_time_stamp'] = self.__last_modified_time_stamp
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

	def reset(self, attribute: str = None) -> None:
		if attribute == 'yaml':
			self.__yaml_data.reset()
