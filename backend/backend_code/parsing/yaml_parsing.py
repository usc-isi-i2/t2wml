import sys
import yaml
import backend_code.t2wml_exceptions as T2WMLExceptions
from backend_code.bindings import bindings
from backend_code.parsing.t2wml_parsing import iter_on_n, t2wml_parse, T2WMLCode, iter_on_n_for_code
from backend_code.spreadsheets.conversions import _cell_range_str_to_tuples


class ForwardSlashEscape(Exception):
    def __init__(self, new_str):
        self.new_str=new_str


class CodeParser:
    def fix_code_string(self, e_str):
        # we made various compromises between valid code from the get-go and easy for the user code. 
        # this function transforms user code into python-acceptable code
        e_str=str(e_str)
        #deal with reserved variables with defined meanings ($end, $sheet, $filename)
        e_str = e_str.replace("$end", str(len(bindings.excel_sheet)))
        e_str = e_str.replace("$sheet", "\""+bindings.excel_sheet.sheet_name+"\"")
        #dollar sign is easy and visually distinctive for users, but invalid python code. so we replace it with t_var_ (for t2wml variable)
        e_str= e_str.replace("$", "t_var_") 
        # "condition and result" is equivalent to "if condition, result"
        e_str = e_str.replace("->", "and")
        return e_str[1:] #get rid of starting equal sign
    
    def is_code_string(self, statement):
        statement=str(statement)
        if statement[0]=="=":
            return True
        if statement[0]!="/": #everything but the edge case
            return False

        #deal with edge cases involving escaping an initial equal sign- we raise a forward slash escape error and modify the strting outside
        if "/=" not in statement: #it just starts with a forward slash, nothing is being escaped
            return False
        else:
            i=0
            while statement[i]=="/":
                i+=1
            #it has x number of forward slashes followed by an equal sign
            if statement[i]=="=":
                raise ForwardSlashEscape(statement[1:])
            #it happens to have /= somewhere in the string, but NOT in the beginning, eg ///hello /=you, return the whole thing
            return False

class TemplateParser(CodeParser):    
    def __init__(self, template, region):
        self.region=region
        self.template=template
        self.eval_template=self.create_eval_template(self.template)

    def get_code_replacement(self, input_str):
        fake_context=dict(t_var_row=self.region.top, t_var_col=self.region.left, t_var_n=0)
        try:
            if self.is_code_string(input_str):
                try:
                    fixed=self.fix_code_string(input_str)
                    #t2wml_parse(fixed, fake_context) #for debugging
                    compiled_statement=compile(fixed, "<string>", "eval")
                    result=t2wml_parse(compiled_statement, fake_context)
                except Exception as e:
                    raise T2WMLExceptions.InvalidYAMLFileException("Invalid expression: "+str(input_str))
                if "t_var" in fixed: #variable code expression
                    return T2WMLCode(compiled_statement, fixed)
                else: #invariable, result from anywhere is the same and we've already calculated it
                    return result

            else:
                return input_str
        except ForwardSlashEscape as e:
            return e.new_str

    def get_code_replacement_for_list(self, in_list):
        new_list=[]
        for item in in_list:
            if isinstance(item, dict):
                new_dict=dict(item)
                for key in item:
                    new_dict[key] = self.get_code_replacement(new_dict[key])
                new_list.append(new_dict)
            else:
                raise T2WMLExceptions.InvalidYAMLFileException("lists of non-dict items not currently supported")
        return new_list

    def create_eval_template(self, template):
        new_template=dict(template)

        for key in template:
            if isinstance(template[key], list):
                new_template[key]=self.get_code_replacement_for_list(template[key])
            else:
                new_template[key]=self.get_code_replacement(template[key])

        return new_template


class RegionParser(CodeParser):
    def __init__(self, yaml_data):
        self.parsed_region=self.parse_region(yaml_data['statementMapping']['region'][0])

    def parse_region_expression(self, statement, context={}):
        try:
            if isinstance(statement, T2WMLCode):
                return iter_on_n_for_code(statement, context)

            if self.is_code_string(statement):
                statement=self.fix_code_string(statement)
        #we run parser even if it's not a string, so that we get back number values for A, B, etc
            if "t_var_n" in statement:
                return iter_on_n(statement, context)
            else:
                return t2wml_parse(statement, context)
        except Exception as e:
            raise T2WMLExceptions.InvalidYAMLFileException("Failed to parse:"+str(statement))



    def check_for_recursive_regions(self, region):
        if "right" in str(region["right"]) \
            or "left" in str(region["left"]) \
            or ("left" in str(region["right"]) and "right" in str(region["left"])):
            raise T2WMLExceptions.ConstraintViolationErrorException("Recursive definition of left and right region parameters.")
        if "top" in str(region["top"]) or \
            "bottom" in str(region["bottom"]) \
            or ("top" in str(region["bottom"]) and "bottom" in str(region["top"])):
            raise T2WMLExceptions.ConstraintViolationErrorException( "Recursive definition of top and bottom region parameters.")
    
    def check_region_boundaries(self, region):
        if region['t_var_left'] > region['t_var_right']:
            raise T2WMLExceptions.ConstraintViolationErrorException("Value of left should be less than or equal to right")
        if region['t_var_top'] > region['t_var_bottom']:
            raise T2WMLExceptions.ConstraintViolationErrorException("Value of top should be less than or equal to bottom")
    
    def fill_dependent_variables(self, yaml_region, region, independent_key:str, dependent_key:str):
        #first get the value for the independent key (eg "left")
        region["t_var_"+independent_key]=self.parse_region_expression(str(yaml_region[independent_key]))
        #using the value of the independent key, iter on n to get value of dependent key (eg "right")
        try:
            region["t_var_"+dependent_key]=self.parse_region_expression(yaml_region[dependent_key], region)
        except:
            raise T2WMLExceptions.ConstraintViolationErrorException("Dyamically defined region did not resolve to value")    

    def parse_region(self, yaml_region):
        if 'range' in yaml_region:
            cell_range=yaml_region["range"]
            try:
                (left, top), (right, bottom) = _cell_range_str_to_tuples(cell_range)
            except Exception as e:
                raise T2WMLExceptions.ErrorInYAMLFileException("range expression for region invalid")

            region_props=dict(t_var_left=left+1, t_var_right=right+1, t_var_top=top+1, t_var_bottom=bottom+1) #need to convert to 1-indexed

        
        else:
            region_props=dict(t_var_left=None, t_var_right=None, t_var_top=None, t_var_bottom=None)
            #first, get any positions that other positions are dependent on
            #(We check for recursion first, so it's safe to just try all the ifs-- max 2 will be entered)
            self.check_for_recursive_regions(yaml_region)

            if "right" in str(yaml_region["left"]):
                self.fill_dependent_variables(yaml_region, region_props, "right", "left")
            if "left" in str(yaml_region["right"]):
                self.fill_dependent_variables(yaml_region, region_props, "left", "right")
            if "top" in str(yaml_region["bottom"]):
                self.fill_dependent_variables(yaml_region, region_props, "top", "bottom")
            if "bottom" in str(yaml_region["top"]):
                self.fill_dependent_variables(yaml_region, region_props, "bottom", "top")
            
            #fill in the remainder
            for boundary in ["left", "right", "top", "bottom"]:
                key="t_var_"+boundary
                if not region_props[key]:
                    try:
                        region_props[key]=self.parse_region_expression(str(yaml_region[boundary]), region_props)
                    except Exception as e:
                        raise e


        self.check_region_boundaries(region_props)
        skip_row, skip_column, skip_cell= self.get_skips(yaml_region, region_props)

        region_props['skip_row']=skip_row
        region_props['skip_column']=skip_column
        region_props['skip_cell']=skip_cell

        return region_props
    
    def get_code_replacement(self, input_str):
        fixed=self.fix_code_string(input_str)
        compiled_statement=compile(fixed, "<string>", "eval")
        return T2WMLCode(compiled_statement, fixed)

    def get_skips(self, yaml_region, region_props):
        skip_row=skip_cell=skip_column=[]
        
        top=region_props["t_var_top"]
        bottom=region_props["t_var_bottom"]
        if 'skip_row' in yaml_region:
            skip_row=[]
            for statement in yaml_region["skip_row"]:
                compiled_statement=self.get_code_replacement(statement)
                for row in range(top, bottom+1):
                    context=dict(t_var_row=row)
                    context.update(region_props)
                    skip=self.parse_region_expression(compiled_statement, context)
                    if skip:
                        skip_row.append(row)
        
        right=region_props["t_var_right"]
        left=region_props["t_var_left"]
        if 'skip_column' in yaml_region:
            skip_column=[]
            for statement in yaml_region["skip_column"]:
                compiled_statement=self.get_code_replacement(statement)
                for col in range(left, right+1):
                    context=dict(t_var_col=col)
                    context.update(region_props)
                    try:
                        skip=self.parse_region_expression(compiled_statement, context)
                    except Exception as e:
                        raise e
                    if skip:
                        skip_column.append(col)

        if 'skip_cell' in yaml_region:
            skip_cell=[]
            for statement in yaml_region["skip_cell"]:
                compiled_statement=self.get_code_replacement(statement)
                for row in range(top, bottom+1):
                    for col in range(left, right+1):
                        context=dict(t_var_col=col, t_var_row=row)
                        context.update(region_props)
                        skip=self.parse_region_expression(compiled_statement, context)
                        if skip:
                            skip_cell.append((col, row))

        return skip_row, skip_column, skip_cell



  
def validate_yaml(yaml_file_path):
        with open(yaml_file_path, 'r') as stream:
            try:
                yaml_file_data = yaml.safe_load(stream)
            except Exception as e:
                raise T2WMLExceptions.InvalidYAMLFileException("Could not load Yaml File: "+str(e))
        
        with open(yaml_file_path, 'r') as f:
            #some real quick security validation, lazy style
            content=f.read()
            if "import" in content: #includes __import__ which is the real evil here
                raise T2WMLExceptions.InvalidYAMLFileException("Could not load Yaml File: invalid T2wml code")



        errors = ""
        for key in yaml_file_data.keys():
            if key != 'statementMapping':
                errors+= "Unrecognized key '" + key + "' found\n"

        if 'statementMapping' not in yaml_file_data:
            errors+= "Key 'statementMapping' not found\n"
        else:
            for key in yaml_file_data['statementMapping'].keys():
                if key not in {'region', 'template', 'created_by'}:
                    errors+= "Unrecognized key '" + key + "' (statementMapping -> " + key + ") found\n"

            if 'created_by' in yaml_file_data['statementMapping']:
                if not yaml_file_data['statementMapping']['created_by']:
                    errors+= "Value of key 'created_by' (statementMapping -> created_by) cannot be empty\n"

            if 'region' not in yaml_file_data['statementMapping']:
                errors +="Key 'region' (statementMapping -> X) not found\n"
            else:
                if yaml_file_data['statementMapping']['region']:
                    yaml_region=yaml_file_data['statementMapping']['region']
                    if isinstance(yaml_region, list):
                        for i in range(len(yaml_region)):
                            for key in yaml_region[i].keys():
                                if key not in {'range', 'left', 'right', 'top', 'bottom', 'skip_row', 'skip_column', 'skip_cell'}:
                                    errors+= "Unrecognized key '" + key + "' (statementMapping -> region[" + str(i) + "] -> " + key + ") found\n"

                            if 'range' not in yaml_region[i]:
                                for required_key in ['left', 'right', 'top', 'bottom']:
                                    present = yaml_region[i].get(required_key, None)
                                    if not present:
                                        errors+= "Key"+required_key+ "(statementMapping -> region[" + str(i) + "] -> X) not found or empty\n"
                            elif not yaml_region[i]['range']:
                                errors+="Value of range cannot be empty"
                                
                            for optional_list_key in ['skip_row', 'skip_column', 'skip_cell']:
                                if optional_list_key in yaml_region[i]:
                                    if not yaml_region[i][optional_list_key] or not isinstance(yaml_region[i][optional_list_key], list):
                                        errors+= "Value of key '"+optional_list_key+"' (statementMapping -> region[" + str(i) + "] -> skip_row) is not appropriate.\
                                                Value should be a list of T2WML expressions.\n"
                    else:
                        errors+= "Value of  key 'region' (statementMapping -> region) must be a list\n"
                else:
                    errors+= "Value of key 'region' (statementMapping -> region) cannot be empty\n"

            if 'template' not in yaml_file_data['statementMapping']:
                errors+= "Key 'template' (statementMapping -> X) not found\n"
            else:
                allowed_keys={'item', 'property', 'value', 'qualifier', 'reference',
                 'unit','lower-bound', 'upper-bound', #Quantity
                 'longitude', 'latitude', 'globe', #Coordinate (+precision below)
                  'calendar', 'precision','time_zone', 'format', #Time
                  'lang', #change to language? #Text
                }
                yaml_template=yaml_file_data['statementMapping']['template']
                if isinstance(yaml_template, dict):
                    for key in yaml_template.keys():
                        if key not in allowed_keys:
                            errors+= "Unrecognized key '" + key + "' (statementMapping -> template -> " + key + ") found\n"

                    for required_key in ['item', 'property', 'value']:
                        if required_key not in yaml_template:
                            errors+= "Key '" + required_key+ "' (statementMapping -> template -> X) not found\n"
                    
                    #allowed_keys.pop("item") #remove item, which isn't allowed in attributes?
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
                                                    errors+= "Unrecognized key '" + key + "' (statementMapping -> template -> " + attribute + "[" + str(i) + "] -> " + key + ") found"
                                        else:
                                            errors+= "Value of  key '" + attribute + "[" + str(i) + "]' (statementMapping -> template -> " + attribute + "[" + str(i) + "]) \
                                                must be a dictionary\n"

                                else:
                                    errors+="Value of  key '" + attribute + "' (statementMapping -> template -> " + attribute + ") must be a list\n"
                            else:
                                errors+= "Value of key '" + attribute + "' (statementMapping -> template -> " + attribute + ") cannot be empty\n"
                else:
                    errors += "Value of  key 'template' (statementMapping -> template) must be a dictionary\n"
        
        if errors:
                raise T2WMLExceptions.ErrorInYAMLFileException(errors)
        
        return yaml_file_data
