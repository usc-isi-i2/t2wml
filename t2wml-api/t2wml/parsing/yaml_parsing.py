import sys
import yaml
import t2wml.utils.t2wml_exceptions as T2WMLExceptions
from t2wml.parsing.t2wml_parsing import T2WMLCode


class ForwardSlashEscape(Exception):  # used for a little hack down below
    def __init__(self, new_str):
        self.new_str = new_str


class CodeParser:
    def fix_code_string(self, e_str):
        # we made various compromises between valid code from the get-go and easy for the user code.
        # this function transforms user code into python-acceptable code
        e_str = str(e_str)
        # deal with sheet-dependent reserved variables
        e_str = e_str.replace("$end", "t_var_sheet_end()")
        e_str = e_str.replace("$sheet", "t_var_sheet_name()")
        e_str = e_str.replace("$filename", "t_var_sheet_file_name()")
        # replace $row, $col, and $n with t_var_ equivalents ($ isn't valid python name but visually distinct for users)
        e_str = e_str.replace("$", "t_var_")
        # "condition and result" is equivalent to "if condition, result"
        e_str = e_str.replace("->", " and ")
        return e_str[1:]  # get rid of starting equal sign

    def is_code_string(self, statement):
        statement = str(statement)
        if statement[0] == "=":
            return True
        if statement[0] != "/":  # everything but the edge case
            return False

        # deal with edge cases involving escaping an initial equal sign
        # small hack: we use a forward slash escape error to avoid needing to return True/False
        # and instead catch and deal with it separately
        if "/=" not in statement:  # it just happens to start with a forward slash, nothing is being escaped
            return False
        else:
            i = 0
            while statement[i] == "/":
                i += 1
            # it has x number of forward slashes followed by an equal sign
            if statement[i] == "=":
                raise ForwardSlashEscape(statement[1:])
            # it happens to have /= somewhere in the string, but NOT in the beginning, eg ///hello /=you, return the whole thing
            return False


class TemplateParser(CodeParser):
    def __init__(self, template):
        self.template = template
        self.eval_template = self.create_eval_template(self.template)

    def get_code_replacement(self, input_str):
        try:
            if self.is_code_string(input_str):
                try:
                    fixed = self.fix_code_string(input_str)
                    compiled_statement = compile(fixed, "<string>", "eval")
                    return T2WMLCode(compiled_statement, fixed, input_str)
                except Exception as e:
                    raise T2WMLExceptions.InvalidYAMLFileException(
                        "Invalid expression: "+str(input_str))
            else:
                return input_str
        except ForwardSlashEscape as e:
            return e.new_str

    def get_code_replacement_for_list(self, in_list):
        new_list = []
        for item in in_list:
            if isinstance(item, dict):
                new_dict = dict(item)
                for key in item:
                    new_dict[key] = self.get_code_replacement(new_dict[key])
                new_list.append(new_dict)
            else:
                raise T2WMLExceptions.InvalidYAMLFileException(
                    "lists of non-dict items not currently supported")
        return new_list

    def create_eval_template(self, template):
        new_template = dict(template)

        for key in template:
            if isinstance(template[key], list):
                new_template[key] = self.get_code_replacement_for_list(
                    template[key])
            else:
                new_template[key] = self.get_code_replacement(template[key])

        return new_template


class Template:
    def __init__(self, dict_template, eval_template):
        self.dict_template = dict_template
        self.eval_template = eval_template

    @staticmethod
    def create_from_yaml(yaml_data):
        template = dict(yaml_data)
        template_parser = TemplateParser(template)
        eval_template = template_parser.eval_template
        return Template(template, eval_template)


def validate_yaml(yaml_file_path):
    with open(yaml_file_path, 'r') as stream:
        try:
            yaml_file_data = yaml.safe_load(stream)
        except Exception as e:
            raise T2WMLExceptions.InvalidYAMLFileException(
                "Could not load Yaml File: "+str(e))

    with open(yaml_file_path, 'r') as f:
        # some real quick security validation, lazy style
        content = f.read()
        if "import" in content:  # includes __import__ which is the real evil here
            raise T2WMLExceptions.InvalidYAMLFileException(
                "Could not load Yaml File: invalid T2wml code")

    errors = ""
    for key in yaml_file_data.keys():
        if key != 'statementMapping':
            errors += "Unrecognized key '" + key + "' found\n"

    if 'statementMapping' not in yaml_file_data:
        errors += "Key 'statementMapping' not found\n"
    else:
        for key in yaml_file_data['statementMapping'].keys():
            if key not in {'region', 'template', 'created_by'}:
                errors += "Unrecognized key '" + key + \
                    "' (statementMapping -> " + key + ") found\n"

        if 'created_by' in yaml_file_data['statementMapping']:
            if not yaml_file_data['statementMapping']['created_by']:
                errors += "Value of key 'created_by' (statementMapping -> created_by) cannot be empty\n"

        if 'region' not in yaml_file_data['statementMapping']:
            errors += "Key 'region' (statementMapping -> X) not found\n"
        else:
            if yaml_file_data['statementMapping']['region']:
                yaml_region = yaml_file_data['statementMapping']['region']
                if isinstance(yaml_region, list):
                    for i in range(len(yaml_region)):
                        for key in yaml_region[i].keys():
                            if key not in {'range', 'left', 'right', 'top', 'bottom', 'skip_rows', 'skip_columns', 'skip_cells', 'columns', 'rows', 'cells'}:
                                errors += "Unrecognized key '" + key + \
                                    "' (statementMapping -> region[" + \
                                    str(i) + "] -> " + key + ") found\n"

                        for optional_list_key in ['skip_rows', 'skip_columns', 'skip_cells', 'columns', 'rows', 'cells']:
                            if optional_list_key in yaml_region[i]:
                                if not isinstance(yaml_region[i][optional_list_key], list):
                                    errors += "Value of key '"+optional_list_key+" should be a list.\n"
                else:
                    errors += "Value of  key 'region' (statementMapping -> region) must be a list\n"
            else:
                errors += "Value of key 'region' (statementMapping -> region) cannot be empty\n"

        if 'template' not in yaml_file_data['statementMapping']:
            errors += "Key 'template' (statementMapping -> X) not found\n"
        else:
            allowed_keys = {'item', 'property', 'value', 'qualifier', 'reference',
                            'unit', 'lower-bound', 'upper-bound',  # Quantity
                            # Coordinate (+precision below)
                            'longitude', 'latitude', 'globe',
                            'calendar', 'precision', 'time_zone', 'format',  # Time
                            'lang',  # change to language? #Text
                            }
            yaml_template = yaml_file_data['statementMapping']['template']
            if isinstance(yaml_template, dict):
                for key in yaml_template.keys():
                    if key not in allowed_keys:
                        errors += "Unrecognized key '" + key + \
                            "' (statementMapping -> template -> " + key + ") found\n"

                for required_key in ['item', 'property', 'value']:
                    if required_key not in yaml_template:
                        errors += "Key '" + required_key + \
                            "' (statementMapping -> template -> X) not found\n"

                # allowed_keys.pop("item") #remove item, which isn't allowed in attributes?
                attributes = ['qualifier', 'reference']
                for attribute in attributes:
                    if attribute in yaml_template:
                        if yaml_template[attribute]:
                            if isinstance(yaml_template[attribute], list):
                                attributes = yaml_template[attribute]
                                for i in range(len(attributes)):
                                    obj = attributes[i]
                                    if obj and isinstance(obj, dict):
                                        for key in obj.keys():
                                            if key not in allowed_keys:
                                                errors += "Unrecognized key '" + key + \
                                                    "' (statementMapping -> template -> " + attribute + \
                                                    "[" + str(i) + "] -> " + \
                                                    key + ") found"
                                    else:
                                        errors += "Value of  key '" + attribute + "[" + str(i) + "]' (statementMapping -> template -> " + attribute + "[" + str(i) + "]) \
                                                must be a dictionary\n"

                            else:
                                errors += "Value of  key '" + attribute + \
                                    "' (statementMapping -> template -> " + \
                                    attribute + ") must be a list\n"
                        else:
                            errors += "Value of key '" + attribute + \
                                "' (statementMapping -> template -> " + \
                                attribute + ") cannot be empty\n"
            else:
                errors += "Value of  key 'template' (statementMapping -> template) must be a dictionary\n"

    if errors:
        raise T2WMLExceptions.ErrorInYAMLFileException(errors)

    return yaml_file_data
