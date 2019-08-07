import os
from Code.ItemTable import ItemTable


class WikifierOutputData:
	def __init__(self):
		self.file_location = None
		self.item_table = None

	def get_file_location(self) -> str:
		"""
		This function return the file location
		:return:
		"""
		return self.file_location

	def get_item_table(self) -> ItemTable:
		"""
		This function returns the item table
		:return:
		"""
		return self.item_table

	def set_file_location(self, file_location: str) -> None:
		"""
		This function sets the file location
		:param file_location:
		:return:
		"""
		self.file_location = file_location

	def set_item_table(self, item_table: ItemTable) -> None:
		"""
		This function sets the item table
		:param item_table:
		:return:
		"""
		self.item_table = item_table

	def reset(self) -> None:
		"""
		This function deletes the wikified output file and resets all the class members
		:return:
		"""
		if self.file_location:
			os.remove(self.file_location)
		self.file_location = None

	def reset_item_table(self) -> None:
		"""
		This function resets the item table object
		:return:
		"""
		self.item_table = None
