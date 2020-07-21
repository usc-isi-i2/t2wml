import sys
from copy import deepcopy
from collections import defaultdict
from t2wml.utils.t2wml_exceptions import T2WMLException
import t2wml.utils.t2wml_exceptions as T2WMLExceptions
from t2wml.mapping.statements import EvaluatedStatement
from t2wml.utils.bindings import update_bindings
from t2wml.parsing.yaml_parsing import validate_yaml, Template
from t2wml.mapping.region import Region
from t2wml.spreadsheets.conversions import to_excel



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
        statement=EvaluatedStatement(context=context, **self.template.eval_template)
        return statement.serialize(), statement.errors

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
