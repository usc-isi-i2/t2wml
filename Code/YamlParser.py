import yaml
from t2wml_parser import parse_and_evaluate
import os
from typing import Sequence
from utility_functions import *
import copy
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

	def get_template_value(self) -> str:
		return str(self.yaml_data['statementMapping']['template']['value'])

	def get_template_property(self) -> str:
		return str(self.yaml_data['statementMapping']['template']['property'])

	def get_qualifiers(self) -> str:
		return self.yaml_data['statementMapping']['template']['qualifier']

	def resolve_template(self, template: str) -> None:
		# Resolve Template Item if needed
		template_item = self.get_template_item()
		if not template_item.isalnum():
			template_item = parse_and_evaluate(template_item)
			template['item'] = template_item

		# Resolve Template Property if needed
		template_property = self.get_template_property()
		if not template_property.isalnum():
			template_property = parse_and_evaluate(template_property)
			template['property'] = template_property

		# Resolve Template Value if needed
		template_value = self.get_template_value()
		if not template_value.isalnum():
			template_value = parse_and_evaluate(template_value)
			template["value"] = template_value

		for i in range(len(template['qualifier'])):
			qualifier_value = str(template['qualifier'][i]['value'])
			if not qualifier_value.isalnum():
				template['qualifier'][i]['value'] = parse_and_evaluate(qualifier_value)

	def get_template(self):
		template = copy.deepcopy(self.yaml_data['statementMapping']['template'])
		self.resolve_template(template)

		return template
