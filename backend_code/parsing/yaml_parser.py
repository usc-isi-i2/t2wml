from collections import OrderedDict
from copy import deepcopy
import yaml
from backend_code.bindings import bindings
from backend_code.spreadsheets.caching import get_sheet

import backend_code.t2wml_exceptions as T2WMLExceptions
from backend_code.parsing.t2wml_parser import parse_expression



def update_bindings(item_table, sheet) -> None:
    """
    This function updates the bindings dictionary with the region, excel_file and item_table
    :param item_table:
    :param region:
    :param excel_filepath:
    :param sheet_name:
    :return:
    """
    
    bindings["excel_sheet"]=sheet
    bindings["item_table"] = item_table



class Region:
    def __init__(self, region_data):
        self.left=region_data["left"]
        self.right=region_data["right"]
        self.top=region_data["top"]
        self.bottom=region_data["bottom"]
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
                        #if (row, col) not in skip_cells
                        #check_if_string_is_invalid(get_cell_value(row, column)):
                        self.indices[(column, row)]=True

    def __iter__(self):
        for key in self.indices:
            yield key
            
    def get(self, key, fallback=None):
        return self.indices.get(key, fallback)
    
    def get_head(self):
        for key in self.indices:
            return key

class YamlObject:
    def __init__(self, filepath, item_table, data_file_path, sheet_name):
        self.yaml_data=self.validate(filepath)
        try:
            self.sheet=get_sheet(data_file_path, sheet_name)
        except IOError:
            raise IOError('Excel File cannot be found or opened')
        update_bindings(item_table=item_table, sheet=self.sheet)
        self._region_props=self.parse_region()
        self._template=dict(self.yaml_data['statementMapping']['template'])
        self.created_by=self.yaml_data['statementMapping'].get('created_by', 't2wml')
    
    @property
    def region_obj(self):
        try:
            r=self._region_object
            return r
        except:
            self._region_object=Region(self._region_props)
            return self._region_object
    
    @property
    def region(self):
        r=dict(self._region_props)
        r["region_object"]=self.region_obj
        return r


    @property
    def template(self):
        return deepcopy(self._template)
        
    def iter_on_variables(self, expression, col=False, row=False):
        try:
            raise NotImplementedError
            val=self.parse_expression(expression)
        except:
            raise T2WMLExceptions.ConstraintViolationErrorException("Dyamically defined region did not resolve to value")    
    
        if not val:
            raise T2WMLExceptions.ConstraintViolationErrorException("Dyamically defined region did not resolve to value")    
        return val

    
    def parse_expression(self, statement, context={}):
        #check if statement is actually an expression:
        return parse_expression(statement, context)
        


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
        if region['left'] > region['right']:
            raise T2WMLExceptions.ConstraintViolationErrorException("Value of left should be less than or equal to right")
        if region['top'] > region['bottom']:
            raise T2WMLExceptions.ConstraintViolationErrorException("Value of top should be less than or equal to bottom")

    def parse_region(self):
        yaml_region = self.yaml_data['statementMapping']['region'][0]
        region=dict(left=None, right=None, top=None, bottom=None)

        #first, get any positions that other positions are dependent on
        #(We check for recursion first, so it's safe to just try all the ifs-- max 2 will be entered)
        self.check_for_recursive_regions(yaml_region)

        if "right" in str(yaml_region["left"]):
            region["right"]=self.iter_on_variables(yaml_region["right"])
        if "left" in str(yaml_region["right"]):
            region["left"]=self.iter_on_variables(yaml_region["left"])
        if "top" in str(yaml_region["bottom"]):
            region["top"]=self.iter_on_variables(yaml_region["top"])
        if "bottom" in str(yaml_region["top"]):
            region["bottom"]=self.iter_on_variables(yaml_region["bottom"])
        
        #fill in the remainder
        for key in region:
            if not region[key]:
                try:
                    region[key]=self.parse_expression(yaml_region[key], region)
                except Exception as e:
                    raise e

        self.check_region_boundaries(region)

        skip_row=skip_cell=skip_column=[]
        
        top=region["top"]
        bottom=region["bottom"]
        if 'skip_row' in yaml_region:
            skip_row=[]
            for statement in yaml_region["skip_row"]:
                for row in range(top, bottom):
                    context=dict(row=row)
                    context.update(region)
                    skip=self.parse_expression(statement, context)
                    if skip:
                        skip_row.append(row)
        
        right=region["right"]
        left=region["left"]
        if 'skip_column' in yaml_region:
            skip_column=[]
            for statement in yaml_region["skip_column"]:
                for col in range(left, right):
                    context=dict(col=col)
                    context.update(region)
                    try:
                        skip=self.parse_expression(statement, context)
                    except Exception as e:
                        raise e
                    if skip:
                        skip_column.append(col)

        if 'skip_cell' in yaml_region:
            skip_cell=[]
            for statement in yaml_region["skip_cell"]:
                for row in range(top, bottom):
                    for col in range(left, right):
                        context=dict(col=col, row=row)
                        context.update(region)
                        skip=self.parse_expression(statement, context)
                        if skip:
                            skip_cell.append((row, col))

        region['skip_row']=skip_row
        region['skip_column']=skip_column
        region['skip_cell']=skip_cell

        return region


    def validate(self, yaml_file_path):
        with open(yaml_file_path, 'r') as stream:
            try:
                yaml_file_data = yaml.safe_load(stream)
            except Exception as e:
                raise T2WMLExceptions.InvalidYAMLFileException("Could not load Yaml File: "+str(e))
        
        with open(yaml_file_path, 'r') as f:
            #some real quick security validation, lazy style
            content=f.read()
            if "import" in content: #includes __import__ which is the real evil here
                raise T2WMLExceptions.InvalidYAMLFileException("Could not load Yaml File: "+str(e))



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
                                if key not in {'left', 'right', 'top', 'bottom', 'skip_row', 'skip_column', 'skip_cell'}:
                                    errors+= "Unrecognized key '" + key + "' (statementMapping -> region[" + str(i) + "] -> " + key + ") found\n"

                            for required_key in ['left', 'right', 'top', 'bottom']:
                                if required_key not in yaml_region[i]:
                                    errors+= "Key"+required_key+ "(statementMapping -> region[" + str(i) + "] -> X) not found\n"

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
                        if key not in {'item', 'property', 'value', 'qualifier', 'calendar', 'precision', 'time_zone', 'format', 'lang', 'longitude', 'latitude', 'unit'}:
                            errors+= "Unrecognized key '" + key + "' (statementMapping -> template -> " + key + ") found\n"

                    for required_key in ['item', 'property', 'value']:
                        if required_key not in yaml_template:
                            errors+= "Key '" + required_key+ "' (statementMapping -> template -> X) not found\n"

                    if 'qualifier' in yaml_template:
                        if yaml_template['qualifier']:
                            if isinstance(yaml_template['qualifier'], list):
                                qualifiers = yaml_template['qualifier']
                                for i in range(len(qualifiers)):
                                    obj = qualifiers[i]
                                    if obj and isinstance(obj, dict):
                                        for key in obj.keys():
                                            if key not in {'property', 'value', 'qualifier', 'calendar',
                                                            'precision', 'time_zone', 'format', 'lang', 'longitude',
                                                            'latitude', 'unit'}:
                                                errors+= "Unrecognized key '" + key + "' (statementMapping -> template -> qualifier[" + str(i) + "] -> " + key + ") found"
                                    else:
                                        errors+= "Value of  key 'qualifier[" + str(i) + "]' (statementMapping -> template -> qualifier[" + str(i) + "]) \
                                            must be a dictionary\n"

                            else:
                                errors+="Value of  key 'qualifier' (statementMapping -> template -> qualifier) must be a list\n"
                        else:
                            errors+= "Value of key 'qualifier' (statementMapping -> template -> qualifier) cannot be empty\n"
                else:
                    errors += "Value of  key 'template' (statementMapping -> template) must be a dictionary\n"
        
        if errors:
                raise T2WMLExceptions.ErrorInYAMLFileException(errors)
        
        return yaml_file_data


    def region_iter(self):
        skip_rows=set(self._region_props.get("skip_row", []))
        skip_cols=set(self._region_props.get("skip_column", []))
        skip_cells=set(self._region_props.get("skip_cell", []))

        top=self._region_props["top"]
        bottom=self._region_props["bottom"]
        left=self._region_props["left"]
        right=self._region_props["right"]
        for r_i in range(top-1, bottom+1):
            if r_i not in skip_rows:
                for c_i in range(left-1, right+1):
                    if c_i not in skip_cols and (r_i, c_i) not in skip_cells:
                        yield r_i, c_i #row needs to be converted back into 1-indexed
