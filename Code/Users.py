from Code.UserData import UserData


class Users:
	__instance = None

	@staticmethod
	def get_instance():
		if Users.__instance is None:
			Users()
		return Users.__instance

	def __init__(self):
		if Users.__instance is not None:
			raise Exception("This class is a singleton!")
		else:
			Users.__instance = self
			self.user_list = dict()

	def get_user(self, user_id):
		return self.user_list.get(user_id, self.create_user(user_id))

	def create_user(self, user_id):
		if not self.user_list.get(user_id, None):
			self.user_list[user_id] = UserData(user_id)
			return self.user_list[user_id]
