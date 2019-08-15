from Code.DataFile import DataFile
from Code.utility_functions import generate_id


class DataFileStore:
	def __init__(self):
		self.__data_files = dict()

	def index_data_file(self, data_file: DataFile) -> None:
		file_id = generate_id()
		while file_id in self.__projects:
			file_id = generate_id()

		self.__data_files[file_id] = data_file
		data_file.set_id(file_id)

	def get_data_file_by_id(self, file_id: str) -> DataFile:
		return self.__data_files.get(file_id, None)