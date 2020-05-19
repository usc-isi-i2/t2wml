import os
import json
from pathlib import Path
from collections import OrderedDict
import yaml
from backend_code.bindings import bindings, update_bindings
from backend_code.spreadsheets.sheet import Sheet
from backend_code.utility_functions import string_is_valid
import backend_code.t2wml_exceptions as T2WMLExceptions
from backend_code.parsing.t2wml_parser import iter_on_n, t2wml_parse
from backend_code.spreadsheets.conversions import _cell_range_str_to_tuples

class ForwardSlashEscape(Exception):
    def __init__(self, new_str):
        self.new_str=new_str



class Region:
    def __init__(self, region_data):
        self.left=region_data["t_var_left"]
        self.right=region_data["t_var_right"]
        self.top=region_data["t_var_top"]
        self.bottom=region_data["t_var_bottom"]
        self.create_holes(region_data)

    def create_holes(self, region_data):
        self.indices=OrderedDict()
        skip_rows=set(region_data.get("skip_row", []))
        skip_cols=set(region_data.get("skip_column", []))
        skip_cells=set(region_data.get("skip_cell", []))
        for column in range(self.left, self.right+1):
            if column not in skip_cols:
                for row in range(self.top, self.bottom+1):
                    if row not in skip_rows:
                        try:
                            if (column, row) not in skip_cells and string_is_valid(bindings.excel_sheet[row-1][column-1]):
                                self.indices[(column, row)]=True
                        except Exception as e:
                            print(e)
    def __iter__(self):
        for key in self.indices:
            yield key
            
    def get(self, key, fallback=None):
        return self.indices.get(key, fallback)
    
    def get_head(self):
        for key in self.indices:
            return key

class YamlCacher:
    def __init__(self, filepath, data_file_path, sheet_name):
        self.filepath=filepath
        self.data_file_path=data_file_path
        self.sheet_name=sheet_name
    
    @property
    def cache_path(self):
            path=Path(self.filepath)
            filename=path.stem+"_"+self.sheet_name+"_cached.json"
            parent=path.parent
            filepath=parent/"cache"
            if not filepath.is_dir():
                os.makedirs(filepath)
            return str(filepath/filename)

    def is_fresh(self):
        if os.path.isfile(self.cache_path):
            if os.path.getmtime(self.cache_path) > os.path.getmtime(self.filepath) and\
                os.path.getmtime(self.cache_path) > os.path.getmtime(self.data_file_path):
                return True
        return False
    
    def save(self, highlight_data, statement_data):
        d={
            "highlight region": highlight_data,
            "download": statement_data
        }
        with open(self.cache_path, 'w') as f:
            json.dump(d, f)

    def get_highlight_region(self):
        if self.is_fresh():
            try:
                with open(self.cache_path, 'r') as f:
                    data=json.load(f)
                return data["highlight region"]
            except:
                pass
        return None

    def get_download(self):
        if self.is_fresh():
            try:
                with open(self.cache_path, 'r') as f:
                    data=json.load(f)
                return data["download"]
            except:
                pass
        return None
    
    

class CodeParser:
    def fix_code_string(self, e_str):
        # we made various compromises between valid code from the get-go and easy for the user code. 
        # this function transforms user code into python-acceptable code
        e_str=str(e_str)
        #deal with reserved variables with defined meetings ($end, $sheet, $filename)
        e_str = e_str.replace("$end", str(len(bindings.excel_sheet)))
        e_str = e_str.replace("$sheet", "\""+bindings.excel_sheet.sheet_name+"\"")
        #$ is easy and visually distinctive for users, but invalid python code. so we replace it with t_var_ (for t2wml variable)
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
    def __init__(self, yaml_data):
        self.template=dict(yaml_data['statementMapping']['template'])
        self.eval_template=self.create_eval_template(yaml_data['statementMapping']['template'])

    def get_code_replacement(self, input_str):
        fake_context=dict(t_var_row=0, t_var_col=0, t_var_n=0)
        try:
            if self.is_code_string(input_str):
                try:
                    fixed=self.fix_code_string(input_str)
                    #t2wml_parse(fixed, fake_context) #for debugging
                    test=compile(fixed, "<string>", "eval")
                    t2wml_parse(test, fake_context)
                    return test
                except:
                    raise T2WMLExceptions.InvalidYAMLFileException("Invalid expression: "+str(input_str))
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
            if self.is_code_string(statement):
                statement=self.fix_code_string(statement)
        #we run parser even if it's not a string, so that we get back number values for A, B, etc
            return iter_on_n(statement, context)
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
    

    def get_skips(self, yaml_region, region_props):
        skip_row=skip_cell=skip_column=[]
        
        top=region_props["t_var_top"]
        bottom=region_props["t_var_bottom"]
        if 'skip_row' in yaml_region:
            skip_row=[]
            for statement in yaml_region["skip_row"]:
                for row in range(top, bottom+1):
                    context=dict(t_var_row=row)
                    context.update(region_props)
                    skip=self.parse_region_expression(statement, context)
                    if skip:
                        skip_row.append(row)
        
        right=region_props["t_var_right"]
        left=region_props["t_var_left"]
        if 'skip_column' in yaml_region:
            skip_column=[]
            for statement in yaml_region["skip_column"]:
                for col in range(left, right+1):
                    context=dict(t_var_col=col)
                    context.update(region_props)
                    try:
                        skip=self.parse_region_expression(statement, context)
                    except Exception as e:
                        raise e
                    if skip:
                        skip_column.append(col)

        if 'skip_cell' in yaml_region:
            skip_cell=[]
            for statement in yaml_region["skip_cell"]:
                for row in range(top, bottom+1):
                    for col in range(left, right+1):
                        context=dict(t_var_col=col, t_var_row=row)
                        context.update(region_props)
                        skip=self.parse_region_expression(statement, context)
                        if skip:
                            skip_cell.append((col, row))

        return skip_row, skip_column, skip_cell




class YamlObject:
    def __init__(self, filepath, item_table, data_file_path, sheet_name, sparql_endpoint, use_cache=False):
        self.yaml_data=validate_yaml(filepath)
        
        try:
            self.sheet=Sheet(data_file_path, sheet_name)
        except IOError:
            raise IOError('Excel File cannot be found or opened')
        update_bindings(item_table=item_table, sheet=self.sheet, sparql_endpoint=sparql_endpoint)
        
        region_parser=RegionParser(self.yaml_data)
        self._region=Region(region_parser.parsed_region)
        
        self.template_parser=TemplateParser(self.yaml_data)
        
        self.sparql_endpoint=sparql_endpoint
        self.created_by=self.yaml_data['statementMapping'].get('created_by', 't2wml')
        
        self.use_cache=use_cache
        self.cacher=YamlCacher(filepath, data_file_path, sheet_name)
    
    @property
    def region(self):
        return self._region

    @property
    def template(self):
        return (self.template_parser.template)
    
    @property
    def eval_template(self):
        return self.template_parser.eval_template
    
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
                yaml_template=yaml_file_data['statementMapping']['template']
                if isinstance(yaml_template, dict):
                    for key in yaml_template.keys():
                        if key not in {'item', 'property', 'value', 'qualifier', 'calendar', 'precision', 'time_zone', 'format', 'lang', 'longitude', 'latitude', 'unit', 'reference'}:
                            errors+= "Unrecognized key '" + key + "' (statementMapping -> template -> " + key + ") found\n"

                    for required_key in ['item', 'property', 'value']:
                        if required_key not in yaml_template:
                            errors+= "Key '" + required_key+ "' (statementMapping -> template -> X) not found\n"
                    
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
                                                if key not in {'property', 'value', 'calendar',
                                                                'precision', 'time_zone', 'format', 'lang', 'longitude',
                                                                'latitude', 'unit'}:
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

