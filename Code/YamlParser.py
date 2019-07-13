import yaml
from typing import Sequence
import copy
from Code.utility_functions import get_actual_cell_index
from Code.t2wml_parser import parse_evaluate_and_get_cell, parse_and_evaluate, generate_tree


class YAMLParser:
	def __init__(self, yaml_file_path: str):
		with open(yaml_file_path, 'r') as stream:
			self.yaml_data = yaml.safe_load(stream)

	def get_region(self) -> Sequence[str]:
		left = parse_and_evaluate(str(self.yaml_data['statementMapping']['region'][0]['left']))
		right = parse_and_evaluate(str(self.yaml_data['statementMapping']['region'][0]['right']))
		top = parse_and_evaluate(str(self.yaml_data['statementMapping']['region'][0]['top']))
		bottom = parse_and_evaluate(str(self.yaml_data['statementMapping']['region'][0]['bottom']))
		return {'left': left, 'right': right, 'top': top, 'bottom': bottom}

	def get_template_item(self) -> str:
		return str(self.yaml_data['statementMapping']['template']['item'])

	def get_template_value(self) -> str:
		return str(self.yaml_data['statementMapping']['template']['value'])

	def get_template_property(self) -> str:
		return str(self.yaml_data['statementMapping']['template']['property'])

	def get_qualifiers(self) -> str:
		return self.yaml_data['statementMapping']['template']['qualifier']

	# def resolve_template(self, template: str) -> None:
	# 	# Resolve Template Item if needed
	# 	template_item = self.get_template_item()
	# 	if not template_item.isalnum():
	# 		result = parse_evaluate_and_get_cell(template_item)
	# 		template['item_cell_index'] = get_actual_cell_index((result[0], result[1]))
	# 		template['item'] = result[2]
	# 	else:
	# 		template['item_cell_index'] = ""
	# 		template['item'] = template_item
	#
	# 	# Resolve Template Property if needed
	# 	template_property = self.get_template_property()
	# 	if not template_property.isalnum():
	# 		template_property = parse_and_evaluate(template_property)
	# 	template['property'] = template_property
	#
	# 	# Resolve Template Value if needed
	# 	template_value = self.get_template_value()
	# 	if not template_value.isalnum():
	# 		template_value = parse_and_evaluate(template_value)
	# 	template["value"] = template_value
	#
	# 	if template.get('qualifier', None):
	# 		for i in range(len(template['qualifier'])):
	# 			qualifier_value = str(template['qualifier'][i]['value'])
	# 			if not qualifier_value.isalnum():
	# 				result = parse_evaluate_and_get_cell(qualifier_value)
	# 				template['qualifier'][i]['cell_index'] = get_actual_cell_index((result[0], result[1]))
	# 				template['qualifier'][i]['value'] = result[2]
	# 			else:
	# 				template['qualifier'][i]['value'] = qualifier_value
	# 				template['qualifier'][i]['cell_index'] = ""

	def resolve_template(self, template: str) -> None:
		# Resolve Template Item if needed
		template_item = self.get_template_item()
		if not template_item.isalnum():
			template['item'] = generate_tree(template_item)
		else:
			template['item'] = template_item

		# Resolve Template Property if needed
		template_property = self.get_template_property()
		if not template_property.isalnum():
			template['property'] = generate_tree(template_property)
		else:
			template['property'] = template_property

		# Resolve Template Value if needed
		template_value = self.get_template_value()
		if not template_value.isalnum():
			template["value"] = generate_tree(template_value)
		else:
			template["value"] = template_value

		if template.get('qualifier', None):
			for i in range(len(template['qualifier'])):
				qualifier_value = str(template['qualifier'][i]['value'])
				if not qualifier_value.isalnum():
					template['qualifier'][i]['value'] = generate_tree(qualifier_value)
				else:
					template['qualifier'][i]['value'] = qualifier_value

	def get_template(self):
		# template = copy.deepcopy(self.yaml_data['statementMapping']['template'])
		template = self.yaml_data['statementMapping']['template']
		self.resolve_template(template)
		return template