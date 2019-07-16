import os
import copy


class YAMLData:
	def __init__(self):
		self.file_location = None
		self.region = {'left': None, 'right': None, 'top': None, 'bottom': None, 'region_object': None}
		self.template = None

	def get_file_location(self) -> str:
		"""
		This function returns the file location of the YAML file
		:return:
		"""
		return self.file_location

	def get_region(self) -> dict:
		"""
		This function returns the region
		:return:
		"""
		return self.region

	def get_template(self) -> dict:
		"""
		This function returns the template
		:return:
		"""
		return self.template

	def get_template_copy(self) -> dict:
		"""
		This function returns the copy of the template
		:return:
		"""
		return copy.deepcopy(self.template)

	def set_file_location(self, file_location: str) -> None:
		"""
		This function sets the file_location of the YAML file
		:param file_location:
		:return:
		"""
		self.file_location = file_location

	def set_region(self, region: dict) -> None:
		"""
		This function sets the region
		:param region:
		:return:
		"""
		self.region['left'] = region['left']
		self.region['right'] = region['right']
		self.region['top'] = region['top']
		self.region['bottom'] = region['bottom']
		self.region['region_object'] = region['region_object']

	def set_template(self, template: dict) -> None:
		"""
		This function sets the template
		:param template:
		:return:
		"""
		self.template = template

	def reset(self) -> None:
		"""
		This function deletes the YAML file and resets all the class members
		:return:
		"""
		if self.file_location:
			os.remove(self.file_location)
		self.file_location = None
		self.region = {'left': None, 'right': None, 'top': None, 'bottom': None}
		self.template = None
