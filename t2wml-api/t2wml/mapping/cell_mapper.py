from t2wml.parsing.yaml_parsing import validate_yaml, TemplateParser
from t2wml.mapping.region import Region


class Template:
    def __init__(self, dict_template, eval_template):
        self.dict_template=dict_template
        self.eval_template=eval_template
    
    @staticmethod
    def create_from_yaml(yaml_data):
        template=dict(yaml_data)
        template_parser=TemplateParser(template)
        eval_template=template_parser.eval_template
        return Template(template, eval_template)

class CellMapper:
    def __init__(self, file_path):
        self.file_path=file_path
        self.yaml_data=validate_yaml(file_path)
        self.created_by=self.yaml_data['statementMapping'].get('created_by', 't2wml')
    
    @property
    def region(self):
        try:
            return self._region
        except:
            self._region= Region.create_from_yaml(self.yaml_data['statementMapping']['region'][0])
            return self._region
    
    @property
    def template(self):
        try:
            return self._template
        except:
            self._template=Template.create_from_yaml(self.yaml_data['statementMapping']['template'])
            return self._template