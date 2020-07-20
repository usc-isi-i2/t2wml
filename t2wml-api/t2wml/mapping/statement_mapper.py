import sys
from copy import deepcopy
from collections import defaultdict
from t2wml.utils.t2wml_exceptions import T2WMLException
import t2wml.utils.t2wml_exceptions as T2WMLExceptions
from t2wml.parsing.classes import ReturnClass
from t2wml.parsing.t2wml_parsing import iter_on_n_for_code, T2WMLCode
from t2wml.spreadsheets.conversions import to_excel
from t2wml.wikification.utility_functions import translate_precision_to_integer, get_property_type
from t2wml.utils.bindings import update_bindings
from t2wml.parsing.yaml_parsing import validate_yaml, Template
from t2wml.mapping.region import Region
from t2wml.utils.utilities import parse_datetime


def parse_time_for_dict(response):
    if "property" in response:
        prop_type=get_property_type(response["property"])
        if prop_type=="Time":
            if "format" in response:
                    try:
                        datetime_string, precision = parse_datetime(
                            str(response["value"]),
                            additional_formats= [response["format"]]
                            )

                    except ValueError:
                        raise T2WMLExceptions.BadDateFormatException("Attempting to parse datetime string that isn't a datetime:" + str(response["value"]))

                    if "precision" not in response:
                        if precision is not None:
                            response["precision"] = int(precision.value.__str__())
                    else:
                        response["precision"] = translate_precision_to_integer(response["precision"])
                    response["value"] = datetime_string



class BaseStatementMapper:
    def get_statement(self, sheet, wikifier, col, row, *args, **kwargs):
        raise NotImplementedError

    def iterator(self):
        raise NotImplementedError

    def do_init(self, sheet, wikifier):
        pass

    def get_all_statements(self, sheet, wikifier):
        self.do_init(sheet, wikifier)
        statements={}
        cell_errors={}
        metadata={
            "data_file":sheet.data_file_name,
            "sheet_name":sheet.name,
        }
        try:
            metadata["created_by"]=self.created_by
        except:
            pass
        for col, row in self.iterator():
            cell=to_excel(col-1, row-1)
            try:
                statement, inner_errors=self.get_cell_statement(sheet, wikifier, col, row, do_init=False)
                statements[cell]=statement
                if inner_errors:
                    cell_errors[cell]=inner_errors
            except T2WMLExceptions.TemplateDidNotApplyToInput as e:
                cell_errors[cell]=e.errors
            except Exception as e:
                cell_errors[cell]=str(e)

        if cell_errors:
            for cell in cell_errors:
                print("error in cell "+ cell+ ": "+str(cell_errors[cell]), file=sys.stderr)
        return statements, cell_errors, metadata


class YamlMapper(BaseStatementMapper):
    def __init__(self, file_path):
        self.file_path=file_path
        self.yaml_data=validate_yaml(file_path)
        self.created_by=self.yaml_data['statementMapping'].get('created_by', 't2wml')
    
    def do_init(self, sheet, wikifier):
        update_bindings(item_table=wikifier.item_table, sheet=sheet)
    
    def get_cell_statement(self, sheet, wikifier, col, row, do_init=True):
        if do_init:
            self.do_init(sheet, wikifier)
        context={"t_var_row":row, "t_var_col":col}
        statement, errors=self._apply_template(self.template, context)
        return statement, errors

    def iterator(self):
        for col, row in self.region:
            yield col, row

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
    
    def _parse_template_for_list_of_dicts(self, attributes, context):
        errors=defaultdict(dict)
        attributes_parsed=[]
        for i, attribute in enumerate(attributes):
            new_dict=dict(attribute)
            for key in attribute:
                try:
                    if isinstance(attribute[key], T2WMLCode):
                        q_parsed=iter_on_n_for_code(attribute[key], context)
                        if q_parsed.value is None:
                            new_dict.pop(key)
                            raise ValueError("Failed to resolve for "+key)
                        new_dict[key]=q_parsed
                except ValueError:
                    errors[str(i+1)][key]=str(e)
                except Exception as e:
                    errors[str(i+1)][key]=str(e)
                    new_dict.pop(key)
            attributes_parsed.append(new_dict)

        return attributes_parsed, errors


    def _parse_template(self, entry, context):
        if isinstance(entry, list):
            entry_parsed, errors=self._parse_template_for_list_of_dicts(entry, context)
            return entry_parsed, errors
        elif isinstance(entry, T2WMLCode):
            entry_parsed= iter_on_n_for_code(entry, context)
            return entry_parsed, None
        else:
            return entry, None


    def _apply_template(self, template, context):
        parsed_template=dict()
        errors=dict()
        for key in template.dict_template:
            try:
                entry_parsed, inner_errors=self._parse_template(template.eval_template[key], context)
                if inner_errors:
                    errors[key]=inner_errors
                parsed_template[key]=entry_parsed
            except Exception as e:
                errors[key]=str(e)
        
        template=dict()
        
        for key in parsed_template:
            if isinstance(parsed_template[key], ReturnClass):
                value=parsed_template[key].value
                if value is None:
                    errors[key]="Not found"
                else:
                    template[key]=value
            elif isinstance(parsed_template[key], list): #qualifiers
                new_list=[]
                for i, attribute_dict in enumerate(parsed_template[key]):
                    new_dict={}
                    mini_error_dict={}
                    for a_key in attribute_dict:
                        if isinstance(attribute_dict[a_key], ReturnClass):
                            value=attribute_dict[a_key].value
                            if value is None:
                                mini_error_dict[a_key]="Not found"
                            else:
                                new_dict[a_key]=value
                        else:
                            new_dict[a_key]=attribute_dict[a_key]

                    #handle value cell
                    q_val=attribute_dict.get("value", None)
                    if not q_val and not attribute_dict.get("longitude", False) and not attribute_dict.get("latitude", False):
                        pass #don't add a qualifier with no value
                    else:
                        try:
                            new_dict["cell"]=to_excel(q_val.col, q_val.row)
                        except AttributeError: #eg hardcoded string
                            pass
                        try:
                            parse_time_for_dict(new_dict)
                        except Exception as e:
                            mini_error_dict['property']=str(e)

                        new_list.append(new_dict)
                    if mini_error_dict:
                        if key in errors:
                            errors[key][str(i+1)]=mini_error_dict
                        else:
                            errors[key]={str(i+1):mini_error_dict}
                template[key]=new_list
                
            else:
                template[key]=parsed_template[key]
        
        #handle item cell
        try:
            item_parsed=parsed_template["item"]
            template["item"]=item_parsed.value
            template["cell"]=to_excel(item_parsed.col, item_parsed.row)
        except AttributeError: #eg hardcoded string
            template["item"]=item_parsed
        
        try:
            parse_time_for_dict(template)
        except Exception as e: #we treat this as a critical failure of value
            errors["value"]=str(e)

        if errors:
            #if the problem is in the main value, property, or item, the statement for this cell is too malformed to return the template
            if set(["value", "property", "item"]).intersection(errors.keys()):
                raise T2WMLExceptions.TemplateDidNotApplyToInput(errors=errors)

        return template, errors
        
