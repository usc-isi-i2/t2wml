from Code.WikifiedRegionStore import WikifiedRegionStore


class DataFile:
	def __init__(self):
		self.__file_id = None
		self.__file_location = None
		self.__current_sheet_name = None
		self.__wikified_region_store = WikifiedRegionStore()

	def set_id(self, file_id):
		self.__file_id = file_id

	def get_id(self):
		return self.__id

	def get_file_location(self) -> str:
		"""
		This function returns the file location
		:return:
		"""
		return self.__file_location

	def get_sheet_name(self) -> str:
		"""
		This function returns the current sheet name
		:return:
		"""
		return self.__current_sheet_name

	def set_file_location(self, file_location: str) -> None:
		"""
		This function sets the file location
		:param file_location:
		:return:
		"""
		self.__file_location = file_location

	def set_sheet_name(self, sheet_name: str) -> None:
		"""
		This function sets the sheet name
		:param sheet_name:
		:return:
		"""
		self.__current_sheet_name = sheet_name

	def get_wikified_region(self, sheet_name: str = None):
		if not sheet_name:
			sheet_name = self.__current_sheet_name
		return self.__wikified_region_store.get_wikified_region(sheet_name)

	def get_region_qnodes(self, sheet_name: str = None):
		return self.get_wikified_region(sheet_name).get_item_table().get_region_qnodes()

	def get_item_table(self):
		return self.get_wikified_region().get_item_table()

	# def reset(self) -> None:
	# 	"""
	# 	This function resets the object by deleting the data file and resetting the class members
	# 	:return:
	# 	"""
	# 	if self.file_location:
	# 		os.remove(self.file_location)
	# 	self.file_location = None
	# 	self.current_sheet_name = None

