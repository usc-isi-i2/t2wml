import os
from Code.ItemTable import ItemTable


class WikifierOutputData:
	def __init__(self):
		self.file_location = None
		self.item_table = None

	def get_file_location(self) -> str:
		return self.file_location

	def get_item_table(self) -> ItemTable:
		return self.item_table

	def set_file_location(self, file_location: str) -> None:
		self.file_location = file_location

	def set_item_table(self, item_table: ItemTable) -> None:
		self.item_table = item_table

	def reset(self):
		if self.file_location:
			os.remove(self.file_location)
		self.file_location = None
		self.item_table = None
