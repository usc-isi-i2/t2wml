from Code.ProjectStore import ProjectStore


class User:
	def __init__(self, id: str):
		self.__id = id
		self.__projects = ProjectStore()

	def get_user_id(self) -> str:
		"""
		This function returns the user id
		:return:
		"""
		return self.__id

	def get_details_of_all_projects(self):
		details = self.__projects.get_details_of_all_projects()
		return details

	def get_project_details(self, project_id):
		details = self.__projects.get_project_details(project_id)
		return details


	# def reset(self, attribute: str = None) -> None:
	# 	"""
	# 	This function deletes all the user files and resets all the class members
	# 	:param attribute:
	# 	:return:
	# 	"""
	# 	if attribute == 'excel':
	# 		self.excel_data.reset()
	# 	elif attribute == 'yaml':
	# 		self.yaml_data.reset()
	# 	elif attribute == 'wikifier_output':
	# 		self.wikifier_output_data.reset()
	# 	else:
	# 		self.excel_data.reset()
	# 		self.yaml_data.reset()
	# 		self.wikifier_output_data.reset()
