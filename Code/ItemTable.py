from typing import Union
import csv
import pyexcel
from copy import deepcopy
from collections import OrderedDict
from Code.utility_functions import get_actual_cell_index, check_if_empty, natural_sort_key, split_cell, \
	get_column_letter, query_wikidata_for_label_and_description, get_excel_cell_index
from collections import defaultdict
import json

class ItemTable:
	def __init__(self, region_map=None):
		if region_map:
			self.table = defaultdict(dict)
			for key, value in region_map['table'].items():
				self.table[get_excel_cell_index(key)] = value
			self.item_wiki = region_map['item_wiki']
		else:
			self.table = defaultdict(dict)
			# self.table = { (col, row): {value:value, context1:item, context2: item}}}
			self.item_wiki = dict()
			# self.item_wiki = {qnode1: {'label': label, 'desc': desc}, qnode2: {'label': label, 'desc': desc}}

	def update_table(self, data_frame, data_filepath: str, sheet_name: str = None):
		sheet = pyexcel.get_sheet(sheet_name=sheet_name, file_name=data_filepath)
		col_names = data_frame.columns.values
		index_of = {val: index for index, val in enumerate(col_names)}

		data_frame[['context']] = data_frame[['context']].fillna(value='__NO_CONTEXT__')
		# update all cells
		no_col_row = data_frame[data_frame.row.isnull() & data_frame.column.isnull()]
		item_value_map = dict()
		# generate item_value_map
		# item_value_map = {value: {context: item}}
		for row in no_col_row.itertuples(index=False):
			if row[index_of['value']] not in item_value_map:
				item_value_map[row[index_of['value']]] = dict()
			# if not row[index_of['context']] or (isinstance(row[index_of['context']], float) and (str(row[index_of['context']]).lower() == 'nan')):
			# 	row[index_of['context']] = '__NO_CONTEXT__'
			item_value_map[row[index_of['value']]][row[index_of['context']]] = row[index_of['item']]

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

		# update cells by col
		only_col = data_frame[~data_frame.row.isnull() & data_frame.column.isnull()]
		col_values = data_frame.column.unique()
		item_value_map = dict()
		# item_value_map = { col: {value: {context: item}}}
		for row in only_col.itertuples(index=False):
			if row[index_of['column']] not in item_value_map:
				item_value_map[row[index_of['column']]] = {row[index_of['value']]: dict()}
			# if not row[index_of['context']] or (isinstance(row[index_of['context']], float) and (str(row[index_of['context']]).lower() == 'nan')):
			# 	row[index_of['context']] = '__NO_CONTEXT__'
			item_value_map[row[index_of['column']]][row[index_of['value']]][row[index_of['context']]] = row[index_of['item']]
		for col in col_values:
			for row in range(len(sheet)):
				try:
					value = sheet[row, col]
					if value in item_value_map[col]:
						if (col, row) not in self.table:
							self.table[(col, row)] = {'__CELL_VALUE__': value}
						for context, item in item_value_map[col][value].items():
							self.table[(col, row)][context] = item
				except IndexError:
					pass

		# update cells by row
		only_row = data_frame[data_frame.row.isnull() & ~data_frame.column.isnull()]
		row_values = data_frame.row.unique()
		item_value_map = dict()
		# item_value_map = { row: {value: {context: item}}}
		for row in only_row.itertuples(index=False):
			if row[index_of['row']] not in item_value_map:
				item_value_map[row[index_of['row']]] = {row[index_of['value']]: dict()}
			# if not row[index_of['context']] or (isinstance(row[index_of['context']], float) and (str(row[index_of['context']]).lower() == 'nan')):
			# 	row[index_of['context']] = '__NO_CONTEXT__'
			item_value_map[row[index_of['row']]][row[index_of['value']]][row[index_of['context']]] = row[index_of['item']]
		for row in row_values:
			for col in range(len(sheet[0])):
				try:
					value = sheet[row, col]
					if value in item_value_map[col]:
						if (col, row) not in self.table:
							self.table[(col, row)] = {'__CELL_VALUE': value}
						for context, item in item_value_map[col][value].items():
							self.table[(col, row)][context] = item
				except IndexError:
					pass

		# update specific cells
		both_row_col = data_frame[~data_frame.row.isnull() & ~data_frame.column.isnull()]
		for row in both_row_col.itertuples(index=False):
			try:
				value = sheet[row[index_of['row']], row[index_of['column']]]
				if not row[index_of['context']]:
					row[index_of['context']] = '__NO_CONTEXT__'
				if (row[index_of['column']], row[index_of['row']]) not in self.table:
					self.table[(row[index_of['column']], row[index_of['row']])] = {'__CELL_VALUE__': value}
				# if not row[index_of['context']] or (isinstance(row[index_of['context']], float) and (str(row[index_of['context']]).lower() == 'nan')):
				# 	row[index_of['context']] = '__NO_CONTEXT__'
				self.table[(row[index_of['column']], row[index_of['row']])][row[index_of['context']]] = row[index_of['item']]
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
					serialized_table['qnodes'][cell][context] = item
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
		if sparql_endpoint:
			self.item_wiki.update(query_wikidata_for_label_and_description(items_not_in_wiki, sparql_endpoint))

			# add label and descriptions for items whose label and desc were not in wiki earlier
			for i in range(len(serialized_table['rowData'])):
				if serialized_table['rowData'][i]['item'] in self.item_wiki:
					serialized_table['rowData'][i]['label'] = self.item_wiki[serialized_table['rowData'][i]['item']]['label']
					serialized_table['rowData'][i]['desc'] = self.item_wiki[serialized_table['rowData'][i]['item']]['desc']

		serialized_table['rowData'] = sorted(serialized_table['rowData'], key=lambda x: (x['context'], x['col'], x['row']))
		return serialized_table

	# def get_region_qnodes(self) -> dict:
	# 	"""
	# 	This function combines self.region_qnodes and self.other and returns the output
	# 	:return:
	# 	"""
	# 	response = deepcopy(self.region_qnodes)
	# 	if self.other["region"]:
	# 		response["regions"]["Other"] = list()
	# 		redundant_cells = list()
	# 		for cell, qnode in self.other["qnodes"].items():
	# 			if cell not in response["qnodes"]:
	# 				response["regions"]["Other"].append(cell)
	# 				response["qnodes"][cell] = qnode
	# 			else:
	# 				redundant_cells.append(cell)
	# 		for cell in redundant_cells:
	# 			self.other["region"].remove(cell)
	# 			del self.other["qnodes"][cell]
	# 		response["regions"]["Other"] = sorted(list(response["regions"]["Other"]), key=natural_sort_key)
	# 	return response
	#
	# def generate_hash_tables(self, file_path: str, excel_filepath: str, sheet_name: str = None, header: bool = True) -> None:
	# 	"""
	# 	This function processes the wikified output file uploaded by the user to build self.other dictionary
	# 	:param file_path:
	# 	:param excel_filepath:
	# 	:param sheet_name:
	# 	:param header:
	# 	:return:
	# 	"""
	# 	cell_to_qnode = dict()
	# 	value_to_qnode = dict()
	# 	with open(file_path, encoding='utf-8') as file:
	# 		csv_reader = csv.reader(file, delimiter=',')
	# 		for row in csv_reader:
	# 			if header:
	# 				header = False
	# 				continue
	# 			if not check_if_empty(row[0]) and not check_if_empty(row[1]):
	# 				cell_to_qnode[(int(row[0]), int(row[1]))] = row[3]
	# 			if row[2] is not None:
	# 				value_to_qnode[row[2]] = row[3]
	#
	# 	sheet = pyexcel.get_sheet(sheet_name=sheet_name, file_name=excel_filepath)
	# 	for cell, qnode in cell_to_qnode.items():
	# 		try:
	# 			cell_value = sheet[cell[1], cell[0]]
	# 			if not check_if_empty(cell_value) and cell_value not in value_to_qnode:
	# 				value_to_qnode[cell_value] = qnode
	# 		except IndexError:
	# 			pass
	#
	# 	for row in range(len(sheet)):
	# 		for col in range(len(sheet[0])):
	# 			try:
	# 				if value_to_qnode.get(sheet[row, col], None):
	# 					cell_to_qnode[(col, row)] = value_to_qnode[sheet[row, col]]
	# 			except IndexError:
	# 				pass
	# 	cell_to_qnode = self.serialize_cell_to_qnode(cell_to_qnode)
	# 	self.other["qnodes"] = cell_to_qnode
	# 	self.other["region"] = list(cell_to_qnode.keys())
	#
	def get_item(self, column: int, row: int) -> Union[defaultdict, Exception]:
		"""
		This function searches return the qnode of the value found at (column, row) cell.
		The catch here is that cell_to_qnode hash table is given preference over value_to_qnode dictionary.
		:param column:
		:param row:
		:return: qnode or exception
		"""
		# cell_index = get_actual_cell_index((column, row))
		temp_table = None
		if (column, row) in self.table:
			temp_table = self.table[(column, row)]
			if "__NO_CONTEXT__" in temp_table:
				temp_table[""] = temp_table["__NO_CONTEXT__"]
				del temp_table["__NO_CONTEXT__"]
			del temp_table['__CELL_VALUE__']
		return temp_table
		# 	return self.region_qnodes['qnodes'][cell_index]
		# elif self.other["qnodes"].get(cell_index, None):
		# 	return self.other["qnodes"][cell_index]
		# else:
		# 	return None
			# raise Exception('No QNode Exists for the cell: ', get_actual_cell_index((column, row)))
	#
	# def serialize_cell_to_qnode(self, cell_to_qnode: dict) -> dict:
	# 	"""
	# 	This function serializes the cell_to_qnode dictionary
	# 	:return:
	# 	"""
	# 	serialized_dict = dict()
	# 	for cell, value in cell_to_qnode.items():
	# 		cell = get_actual_cell_index(cell)
	# 		serialized_dict[cell] = value
	# 	return serialized_dict
	#
	# def check_other_for_common_cells(self, region: str) -> None:
	# 	"""
	# 	This functuon removes the duplicates between region and self.other and removes them from self.other
	# 	:param region:
	# 	:return:
	# 	"""
	# 	if 'Other' in self.region_qnodes['regions'] and region != 'Other':
	# 		self.region_qnodes['regions']['Other'] = sorted(list(set(self.other.keys()) - set(self.region_qnodes['regions'][region])), key=natural_sort_key)
	#
	# def add_region(self, region: str, cell_qnode_map: dict) -> None:
	# 	"""
	# 	This function adds a region and it's respective qnodes in the self.region_qnodes
	# 	:param region:
	# 	:param cell_qnode_map:
	# 	:return:
	# 	"""
	# 	self.region_qnodes['regions'][region] = sorted(list(cell_qnode_map.keys()), key=natural_sort_key)
	# 	self.region_qnodes['qnodes'].update(cell_qnode_map)
	#
	# def delete_region(self, region: str) -> None:
	# 	"""
	# 	This function processes the delete request of a region
	# 	:param region:
	# 	:return:
	# 	"""
	# 	if region == 'All':
	# 		self.region_qnodes = {'regions': OrderedDict(), 'qnodes': dict()}
	# 		self.other = {'region': list(), 'qnodes': dict()}
	# 	elif region == "Other":
	# 		self.other = {'region': list(), 'qnodes': dict()}
	# 	elif region in self.region_qnodes['regions']:
	# 		for cell in self.region_qnodes['regions'][region]:
	# 			if cell in self.region_qnodes['qnodes']:
	# 				del self.region_qnodes['qnodes'][cell]
	# 		del self.region_qnodes['regions'][region]
	#
	# def update_cell(self, region: str, cell: str, qnode: str) -> None:
	# 	"""
	# 	This function updates the qnode of a cell of the specified region
	# 	:param region:
	# 	:param cell:
	# 	:param qnode:
	# 	:return:
	# 	"""
	# 	if region == "Other":
	# 		self.other["qnodes"][cell] = qnode
	# 	elif region == "All":
	# 		if cell in self.region_qnodes["qnodes"]:
	# 			self.region_qnodes["qnodes"][cell] = qnode
	# 		elif cell in self.other["qnodes"]:
	# 			self.other["qnodes"][cell] = qnode
	# 	else:
	# 		self.region_qnodes["qnodes"][cell] = qnode
	#
	# def update_all_cells_within_region(self, region: str, cell: str, qnode: str, excel_filepath: str, sheet_name: str) -> None:
	# 	"""
	# 	This function updates the qnodes of all the cells in a region which have the same value as the cell specified
	# 	:param region:
	# 	:param cell:
	# 	:param qnode:
	# 	:param excel_filepath:
	# 	:param sheet_name:
	# 	:return:
	# 	"""
	# 	sheet = pyexcel.get_sheet(sheet_name=sheet_name, file_name=excel_filepath)
	# 	cell_value = sheet[cell]
	# 	if region == "Other":
	# 		for index in self.other["region"]:
	# 			if sheet[index] == cell_value:
	# 				self.other["qnodes"][index] = qnode
	# 	else:
	# 		for index in self.region_qnodes["regions"][region]:
	# 			if sheet[index] == cell_value:
	# 				self.region_qnodes["qnodes"][index] = qnode
	#
	# def update_all_cells_in_all_region(self, cell, qnode: str, excel_filepath: str, sheet_name: str) -> None:
	# 	"""
	# 	This function updates the qnodes of all the cells in all the regions which have the same value as the cell specified
	# 	:param cell:
	# 	:param qnode:
	# 	:param excel_filepath:
	# 	:param sheet_name:
	# 	:return:
	# 	"""
	# 	sheet = pyexcel.get_sheet(sheet_name=sheet_name, file_name=excel_filepath)
	# 	cell_value = sheet[cell]
	# 	for key, value in self.other["qnodes"].items():
	# 		if sheet[key] == cell_value and key in self.other["qnodes"]:
	# 			self.other["qnodes"][key] = qnode
	# 	for key, value in self.region_qnodes["qnodes"].items():
	# 		if sheet[key] == cell_value and key in self.region_qnodes["qnodes"]:
	# 			self.region_qnodes["qnodes"][key] = qnode
