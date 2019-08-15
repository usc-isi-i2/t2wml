from Code.Project import Project
from Code.utility_functions import generate_id


class ProjectStore:
	def __init__(self):
		self.__projects = dict()

	def index_project(self, project: Project) -> None:
		project_id = generate_id()
		while project_id in self.__projects:
			project_id = generate_id()

		self.__projects[project_id] = project
		project.set_id(project_id)

	def get_project(self, project_id):
		return self.__projects.get(project_id, None)

	def get_details_of_all_projects(self):
		details = list()
		for project in self.__projects.values():
			details.append(project.get_project_details())
		return details

	def get_project_details(self, project_id):
		return self.get_project(project_id).get_project_details()