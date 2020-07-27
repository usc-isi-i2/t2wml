from collections import OrderedDict
from t2wml.utils.t2wml_exceptions import InvalidYAMLFileException
from string import punctuation
from t2wml.utils.bindings import bindings
from t2wml.parsing.yaml_parsing import CodeParser
import t2wml.utils.t2wml_exceptions as T2WMLExceptions
from t2wml.parsing.t2wml_parsing import iter_on_n, t2wml_parse, T2WMLCode, iter_on_n_for_code
from t2wml.spreadsheets.conversions import cell_range_str_to_tuples


def string_is_valid(text: str) -> bool:
    def check_special_characters(text: str) -> bool:
        return all(char in punctuation for char in str(text))
    if text is None or check_special_characters(text):
        return False
    text = text.strip().lower()
    if text in ["", "#na", "nan"]:
        return False
    return True


class Region:
    def __init__(self, index_pairs):
        if len(index_pairs) == 0:
            raise ValueError("Defined region does not include any cells")
        self.index_pairs = index_pairs

    def __iter__(self):
        for pair in self.index_pairs:
            yield pair

    @classmethod
    def create_from_region_data(cls, region_data):
        index_pairs = []
        left = region_data["t_var_left"]
        right = region_data["t_var_right"]
        top = region_data["t_var_top"]
        bottom = region_data["t_var_bottom"]

        skip_rows = set(region_data.get("skip_row", []))
        skip_cols = set(region_data.get("skip_column", []))
        skip_cells = region_data.get("skip_cell", [])
        skip_cells = set(skip_cells)

        for column in range(left, right+1):
            if column not in skip_cols:
                for row in range(top, bottom+1):
                    if row not in skip_rows:
                        if (column, row) not in skip_cells and string_is_valid(str(bindings.excel_sheet[row-1][column-1])):
                            index_pairs.append([column, row])

        return cls(index_pairs)

    @staticmethod
    def create_from_yaml(yaml_data):
        region_parser = RegionParser(yaml_data)
        return Region.create_from_region_data(region_parser.parsed_region)


class RegionParser(CodeParser):
    def __init__(self, yaml_data):
        self.parsed_region = self.parse_region(yaml_data)

    def parse_region(self, yaml_region):
        if 'range' in yaml_region:
            cell_range = yaml_region["range"]
            try:
                (left, top), (right, bottom) = cell_range_str_to_tuples(cell_range)
            except Exception as e:
                raise T2WMLExceptions.ErrorInYAMLFileException(
                    "range expression for region invalid")

            region_props = dict(t_var_left=left+1, t_var_right=right+1, t_var_top=top +
                                1, t_var_bottom=bottom+1)  # need to convert to 1-indexed

        else:
            region_props = dict(t_var_left=None, t_var_right=None,
                                t_var_top=None, t_var_bottom=None)
            # first, get any positions that other positions are dependent on
            # (We check for recursion first, so it's safe to just try all the ifs-- max 2 will be entered)
            self.check_for_recursive_regions(yaml_region)

            if "right" in str(yaml_region["left"]):
                self.fill_dependent_variables(
                    yaml_region, region_props, "right", "left")
            if "left" in str(yaml_region["right"]):
                self.fill_dependent_variables(
                    yaml_region, region_props, "left", "right")
            if "top" in str(yaml_region["bottom"]):
                self.fill_dependent_variables(
                    yaml_region, region_props, "top", "bottom")
            if "bottom" in str(yaml_region["top"]):
                self.fill_dependent_variables(
                    yaml_region, region_props, "bottom", "top")

            # fill in the remainder
            for boundary in ["left", "right", "top", "bottom"]:
                key = "t_var_"+boundary
                if region_props[key] is None:
                    try:
                        region_props[key] = self.parse_region_expression(
                            str(yaml_region[boundary]), region_props)
                    except Exception as e:
                        raise e

        self.check_region_boundaries(region_props)
        skip_row, skip_column, skip_cell = self.get_skips(
            yaml_region, region_props)

        region_props['skip_row'] = skip_row
        region_props['skip_column'] = skip_column
        region_props['skip_cell'] = skip_cell

        return region_props

    def parse_region_expression(self, statement, context={}):
        try:
            if isinstance(statement, T2WMLCode):
                return iter_on_n_for_code(statement, context)

            if self.is_code_string(statement):
                statement = self.fix_code_string(statement)
        # we run parser even if it's not a string, so that we get back number values for A, B, etc
            if "t_var_n" in statement:
                return iter_on_n(statement, context)
            else:
                return t2wml_parse(statement, context)
        except Exception as e:
            raise T2WMLExceptions.InvalidYAMLFileException(
                "Failed to parse:"+str(statement))

    def check_for_recursive_regions(self, region):
        if "right" in str(region["right"]) \
                or "left" in str(region["left"]) \
                or ("left" in str(region["right"]) and "right" in str(region["left"])):
            raise T2WMLExceptions.ConstraintViolationErrorException(
                "Recursive definition of left and right region parameters.")
        if "top" in str(region["top"]) or \
            "bottom" in str(region["bottom"]) \
                or ("top" in str(region["bottom"]) and "bottom" in str(region["top"])):
            raise T2WMLExceptions.ConstraintViolationErrorException(
                "Recursive definition of top and bottom region parameters.")

    def check_region_boundaries(self, region):
        if region['t_var_left'] > region['t_var_right']:
            raise T2WMLExceptions.ConstraintViolationErrorException(
                "Value of left should be less than or equal to right")
        if region['t_var_top'] > region['t_var_bottom']:
            raise T2WMLExceptions.ConstraintViolationErrorException(
                "Value of top should be less than or equal to bottom")

    def fill_dependent_variables(self, yaml_region, region, independent_key: str, dependent_key: str):
        # first get the value for the independent key (eg "left")
        region["t_var_"+independent_key] = self.parse_region_expression(
            str(yaml_region[independent_key]))
        # using the value of the independent key, iter on n to get value of dependent key (eg "right")
        try:
            region["t_var_"+dependent_key] = self.parse_region_expression(
                yaml_region[dependent_key], region)
        except:
            raise T2WMLExceptions.ConstraintViolationErrorException(
                "Dyamically defined region did not resolve to value")

    def get_code_replacement(self, input_str):
        fixed = self.fix_code_string(input_str)
        compiled_statement = compile(fixed, "<string>", "eval")
        return T2WMLCode(compiled_statement, fixed, input_str)

    def get_skips(self, yaml_region, region_props):
        skip_row = skip_cell = skip_column = []

        top = region_props["t_var_top"]
        bottom = region_props["t_var_bottom"]
        if 'skip_row' in yaml_region:
            skip_row = []
            for statement in yaml_region["skip_row"]:
                compiled_statement = self.get_code_replacement(statement)
                for row in range(top, bottom+1):
                    context = dict(t_var_row=row)
                    context.update(region_props)
                    skip = self.parse_region_expression(
                        compiled_statement, context)
                    if skip:
                        skip_row.append(row)

        right = region_props["t_var_right"]
        left = region_props["t_var_left"]
        if 'skip_column' in yaml_region:
            skip_column = []
            for statement in yaml_region["skip_column"]:
                compiled_statement = self.get_code_replacement(statement)
                for col in range(left, right+1):
                    context = dict(t_var_col=col)
                    context.update(region_props)
                    try:
                        skip = self.parse_region_expression(
                            compiled_statement, context)
                    except Exception as e:
                        raise e
                    if skip:
                        skip_column.append(col)

        if 'skip_cell' in yaml_region:
            skip_cell = []
            for statement in yaml_region["skip_cell"]:
                compiled_statement = self.get_code_replacement(statement)
                for row in range(top, bottom+1):
                    for col in range(left, right+1):
                        context = dict(t_var_col=col, t_var_row=row)
                        context.update(region_props)
                        skip = self.parse_region_expression(
                            compiled_statement, context)
                        if skip:
                            skip_cell.append((col, row))

        return skip_row, skip_column, skip_cell
