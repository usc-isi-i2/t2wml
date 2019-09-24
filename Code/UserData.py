from Code.ExcelData import ExcelData
from Code.YAMLData import YAMLData
from Code.WikifierOutputData import WikifierOutputData


class UserData:
	def __init__(self, id: str):
		self.id = id
		self.sparql_endpoint = "https://query.wikidata.org/sparql"
		self.excel_data = ExcelData()
		self.yaml_data = YAMLData()
		self.wikifier_output_data = WikifierOutputData()

	def get_user_id(self) -> str:
		"""
		This function returns the user id
		:return:
		"""
		return self.id

	def get_sparql_endpoint(self) -> str:
		"""
		This function returns the SPARQL endpoint
		:return:
		"""
		return self.sparql_endpoint

	def get_excel_data(self) -> ExcelData:
		"""
		This function returns the ExcelData object
		:return:
		"""
		return self.excel_data

	def get_yaml_data(self) -> YAMLData:
		"""
		This function returns the YAMLData object
		:return:
		"""
		return self.yaml_data

	def get_wikifier_output_data(self) -> WikifierOutputData:
		"""
		This function returns the WikifierOutputData object
		:return:
		"""
		return self.wikifier_output_data

	def set_sparql_endpoint(self, endpoint) -> None:
		"""
		This function sets the SPARQL endpoint
		:return:
		"""
		self.sparql_endpoint = endpoint

	def reset(self, attribute: str = None) -> None:
		"""
		This function deletes all the user files and resets all the class members
		:param attribute:
		:return:
		"""
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
