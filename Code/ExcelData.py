import os


class ExcelData:
	def __init__(self):
		self.file_location = None
		self.current_sheet_name = None

	def get_file_location(self):
		return self.file_location

	def get_sheet_name(self):
		return self.current_sheet_name

	def set_file_location(self, file_location: str) -> None:
		self.file_location = file_location

	def set_sheet_name(self, sheet_name):
		self.current_sheet_name = sheet_name

	def reset(self):
		if self.file_location:
			os.remove(self.file_location)
		self.file_location = None
		self.current_sheet_name = None

