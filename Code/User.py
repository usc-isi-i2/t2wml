from Code.ProjectStore import ProjectStore


class User:
	def __init__(self, id, name, email, picture, given_name, family_name, locale):
		self.__id = id
		self.__email = email
		self.__name = name
		self.__picture = picture
		self.__given_name = given_name
		self.__family_name = family_name
		self.__locale = locale
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

	def get_project(self, project_id):
		return self.__projects.get_project(project_id)

	def get_user_info(self):
		return self.__name, self.__email, self.__picture, self.__given_name, self.__family_name, self.__locale

	def create_project(self, title):
		project_id = self.__projects.create_project(title)
		return project_id

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
