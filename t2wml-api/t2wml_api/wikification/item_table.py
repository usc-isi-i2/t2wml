from typing import Union
from collections import defaultdict
import json
import numpy as np
import pandas as pd
from t2wml_api.spreadsheets.sheet import Sheet
from t2wml_api.wikification.utility_functions import get_labels_and_descriptions
from t2wml_api.spreadsheets.conversions import  _column_index_to_letter, from_excel, to_excel

def patch_get_string_table(cell_table):
    #a patch workaround until we rewrite item table
    string_table=dict()
    for key in cell_table:
        item_string=cell_table[key].pop("__CELL_VALUE__")
        if item_string not in string_table:
            string_table[item_string]={}
            for context_key in cell_table[key]: #contexts:
                string_table[item_string][context_key]=cell_table[key][context_key]
    return string_table

class ItemTable:
    def __init__(self, region_map=None):
        if region_map:
            self.table = defaultdict(dict)
            for key, value in region_map['table'].items():
                self.table[from_excel(key)] = value
            self.item_wiki = region_map['item_wiki']

            #add patch support for string lookup table:
            string_table=region_map.get("string_table", None)
            if not string_table:
                string_table=patch_get_string_table(self.table)
            self.string_table=string_table

        else:
            # self.table = { (col, row): {value:value, context1:item, context2: item}}}
            self.table = defaultdict(dict)
            self.string_table=defaultdict(dict)
            # self.item_wiki = {qnode1: {'label': label, 'desc': desc}, qnode2: {'label': label, 'desc': desc}}
            self.item_wiki = dict()

    def update_table(self, data_frame, data_file_path: str, sheet_name: str = None, flag: int = None):
        sheet = Sheet(data_file_path, sheet_name)
        col_names = data_frame.columns.values
        index_of = {val: index for index, val in enumerate(col_names)}
        data_frame[['context']] = data_frame[['context']].fillna(value='__NO_CONTEXT__')
        if flag == 0:
            self.update_specific_cells(data_frame, sheet, has_to_filter_data_frame=True)
        elif flag == 1:
            self.update_cells_by_col(data_frame, sheet, has_to_filter_data_frame=True)
        elif flag == 2:
            self.update_cells_by_row(data_frame, sheet, has_to_filter_data_frame=True)
        elif flag == 3:
            self.update_all_cells(data_frame, sheet, has_to_filter_data_frame=True)
        else:
            # update all cells
            self.update_all_cells(data_frame, sheet)
            # update cells by col
            self.update_cells_by_col(data_frame, sheet)
            # update cells by row
            self.update_cells_by_row(data_frame, sheet)
            # update specific cells
            self.update_specific_cells(data_frame, sheet)

    def update_specific_cells(self, data_frame, sheet, has_to_filter_data_frame=False):
        if not has_to_filter_data_frame:
            both_row_col = data_frame[~data_frame.row.isnull() & ~data_frame.column.isnull()]
        else:
            both_row_col = data_frame
        both_row_col['column'] = both_row_col['column'].apply(np.int64)
        both_row_col['row'] = both_row_col['row'].apply(np.int64)
        for row in both_row_col.itertuples():
            try:
                value = str(sheet[row.row, row.column]).strip()
                if not row.context:
                    both_row_col.at[row.Index, 'context'] = '__NO_CONTEXT__'
                if (row.column, row.row) not in self.table:
                    self.table[(row.column, row.row)] = {'__CELL_VALUE__': value}
                self.table[(row.column, row.row)][row.context] = row.item
            except (TypeError, IndexError, ValueError):
                pass

    def update_cells_by_row(self, data_frame, sheet, has_to_filter_data_frame=False):
        if not has_to_filter_data_frame:
            only_row = data_frame[~data_frame.row.isnull() & data_frame.column.isnull()]
        else:
            only_row = data_frame
        only_row['row'] = only_row['row'].apply(np.int64)
        row_values = only_row.row.unique()
        # item_value_map = { row: {value: {context: item}}}
        item_value_map = dict()

        for row in only_row.itertuples(index=False):
            cell_value = str(sheet[row.row, row.column]).strip()
            if row.row not in item_value_map:
                item_value_map[row.row] = {cell_value: dict()}
            item_value_map[row.row][cell_value][row.context] = row.item
        for row in row_values:
            for col in range(len(sheet[0])):
                try:
                    value = str(sheet[row, col]).strip()
                    if value in item_value_map[row]:
                        if (col, row) not in self.table:
                            self.table[(col, row)] = {'__CELL_VALUE__': value}
                        for context, item in item_value_map[row][value].items():
                            self.table[(col, row)][context] = item
                except (TypeError, IndexError, ValueError):
                    pass

    def update_cells_by_col(self, data_frame, sheet, has_to_filter_data_frame=None):
        if not has_to_filter_data_frame:
            only_col = data_frame[data_frame.row.isnull() & ~data_frame.column.isnull()]
        else:
            only_col = data_frame
        only_col['column'] = only_col['column'].apply(np.int64)

        col_values = only_col.column.unique()
        # item_value_map = { col: {value: {context: item}}}
        item_value_map = dict()

        for row in only_col.itertuples(index=False):
            try:
                value = str(sheet[row.row, row.column]).strip()
            except (TypeError, IndexError, ValueError):
                value = str(row.value).strip()
            if row.column not in item_value_map:
                item_value_map[row.column] = {value: dict()}
            else:
                item_value_map[row.column][value] = dict()
            item_value_map[row.column][value][row.context] = row.item
        for col in col_values:
            for row in range(len(sheet)):
                try:
                    col = col
                    value = str(sheet[row, col]).strip()
                    if value in item_value_map[col]:
                        if (col, row) not in self.table:
                            self.table[(col, row)] = {'__CELL_VALUE__': value}
                        for context, item in item_value_map[col][value].items():
                            self.table[(col, row)][context] = item
                except (TypeError,IndexError, ValueError):
                    pass

    def update_all_cells(self, data_frame, sheet, has_to_filter_data_frame=None):
        if not has_to_filter_data_frame:
            no_col_row = data_frame[data_frame.row.isnull() & data_frame.column.isnull()]
        else:
            no_col_row = data_frame
        # generate item_value_map
        # item_value_map = {value: {context: item}}
        item_value_map = dict()

        for row in no_col_row.itertuples(index=False):
            try:
                value = str(sheet[row.row, row.column]).strip()
            except (TypeError, AttributeError, IndexError, ValueError):
                value = str(row.value).strip()
            if value not in item_value_map:
                item_value_map[value] = dict()
            item_value_map[value][row.context] = row.item
        self.string_table=item_value_map #for the patch
        for row in range(len(sheet)):
            for col in range(len(sheet[0])):
                try:
                    value = str(sheet[row, col]).strip()
                    if value in item_value_map:
                        for context, item in item_value_map[value].items():
                            if (col, row) not in self.table:
                                self.table[(col, row)] = {'__CELL_VALUE__': value}
                            self.table[(col, row)][context] = item
                except (IndexError, TypeError, ValueError):
                    pass


    def save_to_file(self, file_path):
        temp_table = dict()
        for key, value in self.table.items():
            temp_table[to_excel(*key)] = value
        json_object = {'table': temp_table, 'item_wiki': self.item_wiki, 'string_table':self.string_table}
        with open(file_path, 'w') as f:
            f.write(json.dumps(json_object, indent=3))


    def serialize_table(self, sparql_endpoint: str):
        serialized_table = {'qnodes': defaultdict(defaultdict), 'rowData': list(), 'error': None}
        items_not_in_wiki = set()
        for cell, desc in self.table.items():
            col = _column_index_to_letter(int(cell[0]))
            row = str(int(cell[1]) + 1)
            cell = col+row
            value = desc['__CELL_VALUE__']
            for context, item in desc.items():
                if context != '__CELL_VALUE__':
                    if context == '__NO_CONTEXT__':
                        context = ''
                    serialized_table['qnodes'][cell][context] = {"item": item}
                    row_data = {
                        'context': context,
                        'col': col,
                        'row': row,
                        'value': value,
                        'item': item
                    }
                    if item in self.item_wiki:
                        row_data['label'] = self.item_wiki[item]['label']
                        row_data['desc'] = self.item_wiki[item]['desc']
                    else:
                        items_not_in_wiki.add(item)
                    serialized_table['rowData'].append(row_data)
        
        if sparql_endpoint and items_not_in_wiki:
            labels_and_descriptions = get_labels_and_descriptions(items_not_in_wiki, sparql_endpoint)
            if labels_and_descriptions:
                self.item_wiki.update(labels_and_descriptions)

                # add label and descriptions for items whose label and desc were not in wiki earlier
                for i in range(len(serialized_table['rowData'])):
                    if serialized_table['rowData'][i]['item'] in self.item_wiki:
                        serialized_table['rowData'][i]['label'] = self.item_wiki[serialized_table['rowData'][i]['item']]['label']
                        serialized_table['rowData'][i]['desc'] = self.item_wiki[serialized_table['rowData'][i]['item']]['desc']

                for cell, desc in serialized_table["qnodes"].items():
                    for context, context_desc in desc.items():
                        if context_desc['item'] in self.item_wiki:
                            serialized_table['qnodes'][cell][context]['label'] = self.item_wiki[context_desc['item']]['label']
                            serialized_table['qnodes'][cell][context]['desc'] = self.item_wiki[context_desc['item']]['desc']
        return serialized_table

    def get_item(self, column: int, row: int, context: str) -> Union[defaultdict, Exception]:
        if (column, row) in self.table:
            if not context:
                context = "__NO_CONTEXT__"
            if context in self.table[(column, row)]:
                return self.table[(column, row)][context]
    
    
    def get_item_by_string(self, in_string, context):
        try:
            return self.string_table[in_string][context]
        except:
            raise KeyError("Item for that string and context not found")

    def update_table_from_wikifier_file(self, wikifier_file_path, data_file_path, sheet_name, context=None):
        df = pd.read_csv(wikifier_file_path)
        self.update_table(df, data_file_path, sheet_name)
