from Code.User import User


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
			self.__user_list = dict()

	def get_user(self, user_id: str) -> User:
		"""
		This function returns the user if a user exists with that user_id otherwise it will return None
		:param user_id:
		:return:
		"""
		return self.__user_list.get(user_id, None)

	def create_user(self, user_id: str, name: str, email: str, picture: str, given_name: str, family_name: str, locale: str) -> User:
		"""
		This function creates a new user
		:param user_id:
		:param name:
		:param email:
		:param picture:
		:param given_name:
		:param family_name:
		:param locale:
		:return:
		"""
		if not self.__user_list.get(user_id, None):
			self.__user_list[user_id] = User(user_id, name, email, picture, given_name, family_name, locale)

	def delete_user(self, user_id: str) -> None:
		"""
		This function deletes the user data and then deletes the user from the memory
		:param user_id:
		:return:
		"""
		user = self.get_user(user_id)
		user.reset()
		del self.__user_list[user_id]
