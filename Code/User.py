class User:
	def __init__(self, id, name, email, picture, given_name, family_name, locale):
		self.__id = id
		self.__email = email
		self.__name = name
		self.__picture = picture
		self.__given_name = given_name
		self.__family_name = family_name
		self.__locale = locale

	def get_user_id(self) -> str:
		"""
		This function returns the user id
		:return:
		"""
		return self.__id

	def get_user_info(self):
		user_info = dict()
		user_info["name"] = self.__name
		user_info["email"] = self.__email
		user_info["picture"] = self.__picture
		user_info["givenName"] = self.__given_name
		user_info["familyName"] = self.__family_name
		return user_info
