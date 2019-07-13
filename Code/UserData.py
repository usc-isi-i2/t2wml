from Code.ExcelData import ExcelData
from Code.YAMLData import YAMLData
from Code.WikifierOutputData import WikifierOutputData


class UserData:
	def __init__(self, id):
		self.id = id
		self.excel_data = ExcelData()
		self.yaml_data = YAMLData()
		self.wikifier_output_data = WikifierOutputData()

	def get_user_id(self):
		return self.id

	def get_excel_data(self):
		return self.excel_data

	def get_yaml_data(self):
		return self.yaml_data

	def get_wikifier_output_data(self):
		return self.wikifier_output_data

	def reset(self, attribute: str = None):
		if attribute == 'excel':
			self.excel_data.reset()
		elif attribute == 'yaml':
			self.yaml_data.reset()
		elif attribute == 'wikifier_output':
			self.wikifier_output_data.reset()
		else:
			self.excel_data.reset()
			self.yaml_data.reset()
			self.wikifier_output_data.reset()
