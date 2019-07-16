import os


class ExcelData:
	def __init__(self):
		self.file_location = None
		self.current_sheet_name = None

	def get_file_location(self) -> str:
		"""
		This function returns the file location
		:return:
		"""
		return self.file_location

	def get_sheet_name(self) -> str:
		"""
		This function returns the current sheet name
		:return:
		"""
		return self.current_sheet_name

	def set_file_location(self, file_location: str) -> None:
		"""
		This function sets the file location
		:param file_location:
		:return:
		"""
		self.file_location = file_location

	def set_sheet_name(self, sheet_name: str) -> None:
		"""
		This function sets the sheet name
		:param sheet_name:
		:return:
		"""
		self.current_sheet_name = sheet_name

	def reset(self) -> None:
		"""
		This function resets the object by deleting the data file and resetting the class members
		:return:
		"""
		if self.file_location:
			os.remove(self.file_location)
		self.file_location = None
		self.current_sheet_name = None

