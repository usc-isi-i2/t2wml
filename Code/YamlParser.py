import yaml
from t2wml_parser import parse_and_evaluate
import json
import os
from typing import Sequence
from utility_functions import *
import pprint

__CWD__ = os.getcwd()


class YAMLParser:
	def __init__(self, yaml_file_path: str):
		with open(yaml_file_path, 'r') as stream:
			self.yaml_data = yaml.safe_load(stream)

	def get_region(self) -> Sequence[str]:
		left = self.yaml_data['statementMapping']['region'][0]['left']
		right = self.yaml_data['statementMapping']['region'][0]['right']
		top = self.yaml_data['statementMapping']['region'][0]['top']
		bottom = self.yaml_data['statementMapping']['region'][0]['bottom']
		return left, right, top, bottom

	def get_template_item(self) -> str:
		return str(self.yaml_data['statementMapping']['template']['item'])

	def set_template_item(self, item: str) -> None:
		self.yaml_data['statementMapping']['template']['item'] = item

	def get_template_value(self) -> str:
		return str(self.yaml_data['statementMapping']['template']['value'])

	def set_template_value(self, value: str) -> None:
		self.yaml_data['statementMapping']['template']['value'] = value

	def get_qualifiers(self) -> str:
		return self.yaml_data['statementMapping']['template']['qualifier']

	def set_qualifiers(self, qualifiers: str) -> None:
		self.yaml_data['statementMapping']['template']['qualifier'] = qualifiers

	def resolve_template(self) -> None:
		# Resolve Template Item if needed
		item = self.get_template_item()
		if not item.isalnum():
			item = parse_and_evaluate(item)
			self.set_template_item(item)

		# Resolve Template Value if needed
		value = self.get_template_value()
		if not value.isalnum():
			value = parse_and_evaluate(value)
			self.set_template_value(value)

		# Resolve Qualifiers if needed
		qualifiers = self.get_qualifiers()
		qualifier_modified = False
		for i in range(len(qualifiers)):
			qualifier_value = str(qualifiers[i]['value'])
			if not qualifier_value.isalnum():
				qualifiers[i]['value'] = parse_and_evaluate(qualifier_value)
				qualifier_modified = True

		if qualifier_modified:
			self.set_qualifiers(qualifiers)

	def yaml_to_json(self, yaml_object: str) -> str:
		# print(self.yaml_data)
		# with open("Code\\parsed_yaml.json", "w") as json_out:
		return json.dumps(yaml_object)

	def get_template_in_json(self):
		return self.yaml_to_json(self.yaml_data['statementMapping']['template'])

def pretty_print_json():
	with open('Code\\parsed_yaml.json', 'r') as f:
		data = f.read()
		json_data = json.loads(data)

	pprint.pprint(json_data)

#
# yaml_file = __CWD__ + "\\Datasets\\table-1a.yaml"
# excel_file = __CWD__ + "\\Datasets\\homicide_report_total_and_sex.xlsx"
# excel_sheet_name = "table-1a"
# wikified_result = __CWD__ + "\\Datasets\\wikified_result.csv"
# yp = YAMLParser(yaml_file)
# yp.resolve_yaml()
# yp.yaml_to_json()
# pretty_print_json()
