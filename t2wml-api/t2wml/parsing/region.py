from string import punctuation
from t2wml.utils.bindings import bindings
from t2wml.parsing.yaml_parsing import CodeParser
import t2wml.utils.t2wml_exceptions as T2WMLExceptions
from t2wml.parsing.t2wml_parsing import iter_on_n, t2wml_parse, T2WMLCode, iter_on_n_for_code
from t2wml.spreadsheets.conversions import cell_range_str_to_tuples, cell_str_to_tuple


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



class YamlRegion(CodeParser, Region):
    def __init__(self, yaml_data):
        self.yaml_data=yaml_data
        self.range_args = self.get_range_arguments(yaml_data)
        self.check_range_boundaries(self.range_args)
        self.columns, self.rows, self.cells = self.get_select_arguments(yaml_data)
        self.skip_cols, self.skip_rows, self.skip_cells = self.get_skip_arguments(yaml_data)
        self.index_pairs= self.build_pairs()

    def check_range_boundaries(self, region):
        if region['t_var_left'] > region['t_var_right']:
            raise T2WMLExceptions.ConstraintViolationErrorException(
                "Value of left should be less than or equal to right")
        if region['t_var_top'] > region['t_var_bottom']:
            raise T2WMLExceptions.ConstraintViolationErrorException(
                "Value of top should be less than or equal to bottom")

    def get_range_arguments(self, yaml_region):
        if 'range' in yaml_region:
            cell_range = yaml_region["range"]
            try:
                (left, top), (right, bottom) = cell_range_str_to_tuples(cell_range)
                # need to convert to 1-indexed
                range_args = dict(
                    t_var_left=left+1,
                    t_var_right=right+1,
                    t_var_top=top+1,
                    t_var_bottom=bottom+1)
                return range_args
            except Exception as e:
                raise T2WMLExceptions.ErrorInYAMLFileException(
                    "range expression for region invalid")

        range_args=dict(t_var_left=1,
                    t_var_right=bindings.excel_sheet.col_len,
                    t_var_top=1, 
                    t_var_bottom=bindings.excel_sheet.row_len
                    )

        user_range_args=dict()
        self._check_for_recursion(yaml_region)
        #deal with dependent variables:
        if "right" in str(yaml_region.get("left", "")):
            user_range_args["t_var_right"]=self.parse_region_expression(yaml_region["right"])
        if "left" in str(yaml_region.get("right", "")):
            user_range_args["t_var_left"]=self.parse_region_expression(yaml_region["left"])
        if "top" in str(yaml_region.get("bottom", "")):
            user_range_args["t_var_top"]=self.parse_region_expression(yaml_region["top"])
        if "bottom" in str(yaml_region.get("top", "")):
            user_range_args["t_var_bottom"]=self.parse_region_expression(yaml_region["bottom"])
        
        #deal with the rest
        keys= set(["left", "right", "top", "bottom"]).intersection(yaml_region)
        for key in keys:
            user_range_args["t_var_"+key]=self.parse_region_expression(yaml_region[key], user_range_args)

        range_args.update(user_range_args)
        return range_args


    def parse_region_expression(self, statement, context={}):
        try:
            if isinstance(statement, T2WMLCode):
                try:
                    return iter_on_n_for_code(statement, context)
                except Exception as e:
                    raise T2WMLExceptions.InvalidYAMLFileException(
                        "Failed to parse: "+statement.unmodified_str+ "(" + str(e) + ")")

            statement=str(statement)
            if self.is_code_string(statement):
                statement = self.fix_code_string(statement)
        
            if "t_var_n" in statement:
                return iter_on_n(statement, context)
            else:
                return t2wml_parse(statement, context)
        except Exception as e:
            raise T2WMLExceptions.InvalidYAMLFileException(
                "Failed to parse:"+str(statement)+ "(" + str(e) + ")")

    def _check_for_recursion(self, region):
        if "right" in str(region.get("right", "")) \
                or "left" in str(region.get("left", "")) \
                or ("left" in str(region.get("right", "")) and "right" in str(region.get("left"))):
            raise T2WMLExceptions.ConstraintViolationErrorException(
                "Recursive definition of left and right region parameters.")
        if "top" in str(region.get("top", "")) or \
            "bottom" in str(region.get("bottom", "")) \
                or ("top" in str(region.get("bottom", "")) and "bottom" in str(region.get("top", ""))):
            raise T2WMLExceptions.ConstraintViolationErrorException(
                "Recursive definition of top and bottom region parameters.")

    
    def _get_list_args(self, columns, rows, cells):
        new_columns=[]
        new_rows=[]
        new_cells=[]

        for col_arg in columns:
            if self.is_code_string(col_arg):
                if "->" not in col_arg:
                    col_arg+=" -> $col"
                code_arg=self.get_code_replacement(col_arg)
                if "$row" in str(col_arg):
                    raise T2WMLExceptions.InvalidYAMLFileException("Cannot use $row in columns or skip_columns")
                for col in range(self.range_args["t_var_left"], self.range_args["t_var_right"]+1):
                    context={"t_var_col":col}
                    context.update(self.range_args)
                    parsed_col=self.parse_region_expression(code_arg, context)
                    if parsed_col != False:
                        new_columns.append(parsed_col)
            else: #need to parse it anyway to translate A->1
                new_columns.append(self.parse_region_expression(col_arg))

        for row_arg in rows:
            if self.is_code_string(row_arg):
                if "->" not in row_arg:
                    row_arg+=" -> $row"
                code_arg=self.get_code_replacement(row_arg)
                if "$col" in str(row_arg):
                    raise T2WMLExceptions.InvalidYAMLFileException("Cannot use $col in rows or skip_rows")
                for row in range(self.range_args["t_var_top"], self.range_args["t_var_bottom"]+1):
                    context={"t_var_row":row}
                    context.update(self.range_args)
                    parsed_row=self.parse_region_expression(code_arg, context)
                    if parsed_row != False:
                        new_rows.append(parsed_row)
            else:
                new_rows.append(int(row_arg))

        for cell_arg in cells:
            if self.is_code_string(cell_arg):
                if "->" not in cell_arg:
                    cell_arg+=" -> ($col, $row)"
                code_arg=self.get_code_replacement(cell_arg)
                for col in range(self.range_args["t_var_left"], self.range_args["t_var_right"]+1):
                    for row in range(self.range_args["t_var_top"], self.range_args["t_var_bottom"]+1):
                        context={"t_var_col":col, "t_var_row":row}
                        context.update(self.range_args)
                        parsed_cell=self.parse_region_expression(code_arg, context)
                        if parsed_cell != False:
                            new_cells.append(parsed_cell)
            else: #need to parse it anyway to translate A->1
                (col, row) = cell_str_to_tuple(cell_arg)
                new_cells.append((col+1, row+1)) #switch to one-indexed
        return new_columns, new_rows, new_cells
    
    def get_select_arguments(self, yaml_data):
        columns=yaml_data.get("columns", [])
        rows=yaml_data.get("rows", [])
        cells=yaml_data.get("cells", [])
        columns, rows, cells= self._get_list_args(columns, rows, cells)
        return columns, rows, cells
    
    def get_skip_arguments(self, yaml_data):
        columns=yaml_data.get("skip_columns", [])
        rows=yaml_data.get("skip_rows", [])
        cells=yaml_data.get("skip_cells", [])
        skip_columns, skip_rows, skip_cells = self._get_list_args(columns, rows, cells)
        return skip_columns, skip_rows, skip_cells

    def build_pairs(self):
        index_pairs=[]
        #if we only specified cells, not any of the range args, don't build a range for pairs
        range_args=set(['range', 'top', 'bottom', 'right', 'left', 'columns', 'rows'])
        if len(range_args.intersection(self.yaml_data)):
            if not self.columns:
                try:
                    self.columns=[col for col in range(self.range_args["t_var_left"], self.range_args["t_var_right"]+1)]
                except Exception as e:
                    raise T2WMLExceptions.InvalidYAMLFileException("You have not specified a valid set of arguments (left+right, range, or columns) for columns")
            if not self.rows:
                try:
                    self.rows=[row for row in range(self.range_args["t_var_top"], self.range_args["t_var_bottom"]+1)]
                except Exception as e:
                    raise T2WMLExceptions.InvalidYAMLFileException("You have not specified a valid set of arguments (top+bottom, range, or rows) for rows")
        

            for col in self.skip_cols:
                self.columns.remove(col)
            for row in self.skip_rows:
                self.rows.remove(row)

            skip_cells=set(self.skip_cells)
            for column in self.columns:
                for row in self.rows:
                    if (column, row) not in skip_cells and \
                        string_is_valid(str(bindings.excel_sheet[row-1][column-1])):
                            index_pairs.append((column, row))
            
            for cell in self.cells:
                (col, row)=cell
                if cell not in skip_cells and\
                        string_is_valid(str(bindings.excel_sheet[row-1][col-1])):
                    index_pairs.append(cell)

        else:
            for (col, row) in self.cells:
                if col not in self.skip_cols \
                    and row not in self.skip_rows\
                        and (col, row) not in self.skip_cells and\
                            string_is_valid(str(bindings.excel_sheet[row-1][col-1])):
                    index_pairs.append((col, row))

        

        
        if len(index_pairs)<1:
             raise T2WMLExceptions.InvalidYAMLFileException("No data cells specified")

        return index_pairs
    
    def get_code_replacement(self, input_str):
        fixed = self.fix_code_string(input_str)
        compiled_statement = compile(fixed, "<string>", "eval")
        return T2WMLCode(compiled_statement, fixed, input_str)
