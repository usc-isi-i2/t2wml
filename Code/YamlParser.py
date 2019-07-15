import yaml
from typing import Sequence
from Code.t2wml_parser import parse_and_evaluate, generate_tree


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
		try:
			response = str(self.yaml_data['statementMapping']['template']['item'])
		except KeyError:
			response = None
		return response

	def get_template_value(self) -> str:
		try:
			response = str(self.yaml_data['statementMapping']['template']['value'])
		except KeyError:
			response = None
		return response

	def get_template_property(self) -> str:
		try:
			response = str(self.yaml_data['statementMapping']['template']['property'])
		except KeyError:
			response = None
		return response

	def get_qualifiers(self) -> str:
		try:
			response = self.yaml_data['statementMapping']['template']['qualifier']
		except KeyError:
			response = None
		return response

	def resolve_template(self, template: str) -> None:
		# Resolve Template Item if needed
		template_item = self.get_template_item()
		if template_item:
			if not template_item.isalnum():
				template['item'] = generate_tree(template_item)
			else:
				template['item'] = template_item

		# Resolve Template Property if needed
		template_property = self.get_template_property()
		if template_property:
			if template_property and not template_property.isalnum():
				template['property'] = generate_tree(template_property)
			else:
				template['property'] = template_property

		# Resolve Template Value if needed
		template_value = self.get_template_value()
		if template_value:
			if not template_value.isalnum():
				template["value"] = generate_tree(template_value)
			else:
				template["value"] = template_value

		if template.get('qualifier', None):
			for i in range(len(template['qualifier'])):
				qualifier_value = str(template['qualifier'][i]['value'])
				if qualifier_value:
					if not qualifier_value.isalnum():
						template['qualifier'][i]['value'] = generate_tree(qualifier_value)
					else:
						template['qualifier'][i]['value'] = qualifier_value

	def get_template(self):
		template = self.yaml_data['statementMapping']['template']
		self.resolve_template(template)
		return template
