from Code.UserData import UserData


class Users:
	__instance = None

	@staticmethod
	def get_instance():
		"""
		This function helps in keeping this class as singleton
		:return:
		"""
		if Users.__instance is None:
			Users()
		return Users.__instance

	def __init__(self):
		if Users.__instance is not None:
			raise Exception("This class is a singleton!")
		else:
			Users.__instance = self
			self.user_list = dict()

	def get_user(self, user_id: str) -> UserData:
		"""
		This function returns the user if a user exists with that user_id otherwise it will create a new one
		:param user_id:
		:return:
		"""
		return self.user_list.get(user_id, self.create_user(user_id))

	def create_user(self, user_id: str) -> UserData:
		"""
		This function creates a new user
		:param user_id:
		:return:
		"""
		if not self.user_list.get(user_id, None):
			self.user_list[user_id] = UserData(user_id)
			return self.user_list[user_id]

	def delete_user(self, id: str) -> None:
		"""
		This function deletes the user data and then deletes the user from the memory
		:param id:
		:return:
		"""
		user = self.get_user(id)
		user.reset()
		del self.user_list[id]
