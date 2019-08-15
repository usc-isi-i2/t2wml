import os
import copy


class YAMLData:
	def __init__(self):
		self.__file_location = None
		self.__region = {'left': None, 'right': None, 'top': None, 'bottom': None, 'region_object': None}
		self.__template = None

	def get_file_location(self) -> str:
		"""
		This function returns the file location of the YAML file
		:return:
		"""
		return self.__file_location

	def get_region(self) -> dict:
		"""
		This function returns the region
		:return:
		"""
		return self.__region

	def get_template(self) -> dict:
		"""
		This function returns the template
		:return:
		"""
		return self.__template

	def get_template_copy(self) -> dict:
		"""
		This function returns the copy of the template
		:return:
		"""
		return copy.deepcopy(self.__template)

	def set_file_location(self, file_location: str) -> None:
		"""
		This function sets the file_location of the YAML file
		:param file_location:
		:return:
		"""
		self.__file_location = file_location

	def set_region(self, region: dict) -> None:
		"""
		This function sets the region
		:param region:
		:return:
		"""
		self.__region['left'] = region['left']
		self.__region['right'] = region['right']
		self.__region['top'] = region['top']
		self.__region['bottom'] = region['bottom']
		self.__region['region_object'] = region['region_object']

	def set_template(self, template: dict) -> None:
		"""
		This function sets the template
		:param template:
		:return:
		"""
		self.__template = template

	# def reset(self) -> None:
	# 	"""
	# 	This function deletes the YAML file and resets all the class members
	# 	:return:
	# 	"""
	# 	if self.__file_location:
	# 		os.remove(self.__file_location)
	# 	self.__file_location = None
	# 	self.__region = {'left': None, 'right': None, 'top': None, 'bottom': None}
	# 	self.__template = None
