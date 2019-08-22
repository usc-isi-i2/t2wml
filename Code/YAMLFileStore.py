from collections import OrderedDict


class YAMLFileStore:
	def __init__(self):
		# {yaml_file_id: yaml_file_object }
		self.__yaml_files = OrderedDict()
		# {(file_id, sheet_name): yaml_file_id}
		self.__yaml_file_and_data_file_mapping = OrderedDict()

	def index_yaml_file_with_date_file(self, data_file_id, sheet_name, yaml_file_object):
		yaml_file_id = yaml_file_object.get_id()
		self.index_yaml_file(yaml_file_object)
		self.__yaml_file_and_data_file_mapping[(data_file_id, sheet_name)] = yaml_file_id

	def get_yaml_file_of_sheet(self, data_file_id, sheet_name):
		yaml_file_id = self.__yaml_file_and_data_file_mapping.get((data_file_id, sheet_name), None)
		return self.__yaml_files.get(yaml_file_id, None)

	def get_yaml_file(self, yaml_file_id):
		return self.__yaml_files.get(yaml_file_id, None)

	def index_yaml_file(self, yaml_file_object):
		yaml_file_id = yaml_file_object.get_id()
		if yaml_file_id not in self.__yaml_files:
			self.__yaml_files[yaml_file_id] = yaml_file_object

