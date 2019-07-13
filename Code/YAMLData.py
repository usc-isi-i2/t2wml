import os
import copy


class YAMLData:
	def __init__(self):
		self.file_location = None
		self.region = {'left': None, 'right': None, 'top': None, 'bottom': None}
		self.template = None

	def get_file_location(self) -> str:
		return self.file_location

	def get_region(self) -> dict:
		return self.region

	def get_template(self) -> dict:
		return self.template

	def get_template_copy(self) -> dict:
		return copy.deepcopy(self.template)

	def set_file_location(self, file_location: str) -> None:
		self.file_location = file_location

	def set_region(self, region: dict) -> None:
		self.region['left'] = region['left']
		self.region['right'] = region['right']
		self.region['top'] = region['top']
		self.region['bottom'] = region['bottom']

	def set_template(self, template: dict) -> None:
		self.template = template

	def reset(self):
		if self.file_location:
			os.remove(self.file_location)
		self.file_location = None
		self.region = {'left': None, 'right': None, 'top': None, 'bottom': None}
		self.template = None
