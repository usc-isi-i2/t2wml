from typing import Union
import pyexcel
from Code.utility_functions import get_actual_cell_index, check_if_empty, natural_sort_key, split_cell, \
	get_column_letter, query_wikidata_for_label_and_description, get_excel_cell_index
from collections import defaultdict
import json
import numpy as np


class ItemTable:
	def __init__(self, region_map=None):
		if region_map:
			self.table = defaultdict(dict)
			for key, value in region_map['table'].items():
				self.table[get_excel_cell_index(key)] = value
			self.item_wiki = region_map['item_wiki']
		else:
			# self.table = { (col, row): {value:value, context1:item, context2: item}}}
			self.table = defaultdict(dict)
			# self.item_wiki = {qnode1: {'label': label, 'desc': desc}, qnode2: {'label': label, 'desc': desc}}
			self.item_wiki = dict()

	def update_table(self, data_frame, data_filepath: str, sheet_name: str = None, flag: int = None):
		sheet = pyexcel.get_sheet(sheet_name=sheet_name, file_name=data_filepath)
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
				value = sheet[row.row, row.column]
				if not row.context:
					both_row_col.at[row.Index, 'context'] = '__NO_CONTEXT__'
				if (row.column, row.row) not in self.table:
					self.table[(row.column, row.row)] = {'__CELL_VALUE__': value}
				self.table[(row.column, row.row)][row.context] = row.item
			except IndexError:
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
			if row.row not in item_value_map:
				item_value_map[row.row] = {sheet[row.row, row.column]: dict()}
			item_value_map[row.row][sheet[row.row, row.column]][row.context] = row.item
		for row in row_values:
			for col in range(len(sheet[0])):
				try:
					value = sheet[row, col]
					if value in item_value_map[row]:
						if (col, row) not in self.table:
							self.table[(col, row)] = {'__CELL_VALUE__': value}
						for context, item in item_value_map[row][value].items():
							self.table[(col, row)][context] = item
				except IndexError:
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
				value = sheet[row.row, row.column]
			except IndexError:
				value = row.value
			if row.column not in item_value_map:
				item_value_map[row.column] = {value: dict()}
			else:
				item_value_map[row.column][value] = dict()
			item_value_map[row.column][value][row.context] = row.item
		for col in col_values:
			for row in range(len(sheet)):
				try:
					col = col
					value = sheet[row, col]
					if value in item_value_map[col]:
						if (col, row) not in self.table:
							self.table[(col, row)] = {'__CELL_VALUE__': value}
						for context, item in item_value_map[col][value].items():
							self.table[(col, row)][context] = item
				except IndexError:
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
			if sheet[row.row, row.column] not in item_value_map:
				item_value_map[sheet[row.row, row.column]] = dict()
			item_value_map[sheet[row.row, row.column]][row.context] = row.item

		for row in range(len(sheet)):
			for col in range(len(sheet[0])):
				try:
					value = sheet[row, col]
					if value in item_value_map:
						for context, item in item_value_map[value].items():
							if (col, row) not in self.table:
								self.table[(col, row)] = {'__CELL_VALUE__': value}
							self.table[(col, row)][context] = item
				except IndexError:
					pass

	def to_json(self):
		temp_table = dict()
		for key, value in self.table.items():
			temp_table[get_actual_cell_index(key)] = value
		json_object = {'table': temp_table, 'item_wiki': self.item_wiki}
		return json.dumps(json_object, indent=3)

	def serialize_table(self, sparql_endpoint: str):
		serialized_table = {'qnodes': defaultdict(defaultdict), 'rowData': list(), 'error': None}
		items_not_in_wiki = set()
		for cell, desc in self.table.items():
			col = get_column_letter(int(cell[0]) + 1)
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
						items_not_in_wiki.add('wd:' + item)
					serialized_table['rowData'].append(row_data)
		items_not_in_wiki = ' '.join(items_not_in_wiki)
		if sparql_endpoint and items_not_in_wiki:
			labels_and_descriptions = query_wikidata_for_label_and_description(items_not_in_wiki, sparql_endpoint)

			if labels_and_descriptions:
				self.item_wiki.update(labels_and_descriptions)

				# add label and descriptions for items whose label and desc were not in wiki earlier
				for i in range(len(serialized_table['rowData'])):
					if serialized_table['rowData'][i]['item'] in self.item_wiki:
						serialized_table['rowData'][i]['label'] = self.item_wiki[serialized_table['rowData'][i]['item']]['label']
						serialized_table['rowData'][i]['desc'] = self.item_wiki[serialized_table['rowData'][i]['item']]['desc']

				for cell, desc in serialized_table["qnodes"].items():
					for context, context_desc in desc.items():
						serialized_table['qnodes'][cell][context]['label'] = self.item_wiki[context_desc['item']]['label']
						serialized_table['qnodes'][cell][context]['desc'] = self.item_wiki[context_desc['item']]['desc']
		return serialized_table

	def get_item(self, column: int, row: int, context: str) -> Union[defaultdict, Exception]:
		if (column, row) in self.table:
			if not context:
				context = "__NO_CONTEXT__"
			if context in self.table[(column, row)]:
				return self.table[(column,row)][context]
