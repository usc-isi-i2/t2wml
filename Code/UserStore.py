# from Code.User import User
from pathlib import Path
import json

from dill.pointers import parents
from oslo_concurrency import lockutils


class UserStore:
	__instance = None

	@staticmethod
	def get_instance():
		"""
		This function helps in keeping this class as singleton
		:return:
		"""
		if UserStore.__instance is None:
			UserStore()
		return UserStore.__instance

	def __init__(self):
		if UserStore.__instance is not None:
			raise Exception("This class is a singleton!")
		else:
			UserStore.__instance = self
			config_folder_path = Path.cwd() / "config"
			config_folder_path.mkdir(parents=True, exist_ok=True)
			self.file_path = config_folder_path / "users.json"
			self.file_path.touch(exist_ok=True)
			with open(self.file_path) as json_data:
				try:
					self.__user_list = json.load(json_data)
				except json.decoder.JSONDecodeError as e:
					self.__user_list = dict()

	def get_user(self, user_id: str) -> dict:
		"""
		This function returns the user if a user exists with that user_id otherwise it will return None
		:param user_id:
		:return:
		"""
		return self.__user_list.get(user_id, None)

	@lockutils.synchronized('create_user', fair=True, external=True, lock_path=str(Path.cwd() / "config"))
	def create_user(self, user_id: str, user_info: dict) -> None:
		"""
		This function creates a new user
		:param user_id:
		:param user_info:
		:return:
		"""
		if not self.__user_list.get(user_id, None):
			user = {
					'name': user_info["name"],
					'email': user_info["email"],
					'picture': user_info["picture"],
					'givenName': user_info["given_name"],
					'familyName': user_info["family_name"],
					'projects': dict()
					}
			self.__user_list[user_id] = user
			with open(self.file_path, 'w') as users_json:
				json.dump(self.__user_list, users_json, indent=3)

	def get_user_info(self, user_id: str) -> dict:
		"""
		This function returns the details of a user viz. Name, email, picture, etc.
		:param user_id:
		:return:
		"""
		user_info = self.__user_list.get(user_id, None)
		return user_info
