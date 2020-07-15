import json
from pathlib import Path
from ast import literal_eval

from t2wml.mapping.t2wml_handling import get_all_template_statements, resolve_cell
from t2wml.mapping.download import get_file_output_from_statements
from t2wml.spreadsheets.sheet import Sheet
from t2wml.utils.t2wml_exceptions import T2WMLException, TemplateDidNotApplyToInput
from t2wml.settings import t2wml_settings
from t2wml.api import set_sparql_endpoint, set_wikidata_provider, KnowledgeGraph
from t2wml.spreadsheets.sheet import Sheet
from t2wml.spreadsheets.conversions import column_index_to_letter
from t2wml.wikification.wikify_handling import service_wikifier
from caching import CacheCellMapper
from app_config import DEFAULT_SPARQL_ENDPOINT
from wikidata_models import DatabaseProvider

def wikify(region, filepath, sheet_name, context):
    df, problem_cells= service_wikifier(region, filepath, sheet_name, context)
    return df, problem_cells

def update_t2wml_settings():
    set_sparql_endpoint(DEFAULT_SPARQL_ENDPOINT)
    set_wikidata_provider(DatabaseProvider(DEFAULT_SPARQL_ENDPOINT))
    t2wml_settings.update({
                "cache_data_files":True,
                "cache_results":True,
                #"wikidata_provider":DatabaseProvider(DEFAULT_SPARQL_ENDPOINT),
                #"sparql_endpoint":project.sparql_endpoint,
                #"storage_folder":UPLOAD_FOLDER
                })

def get_kg(data_sheet, cell_mapper, wikifier_file):
    item_table=get_item_table(wikifier_file, data_sheet)
    sheet=Sheet(data_sheet.data_file.file_path, data_sheet.name)
    kg=KnowledgeGraph.generate(cell_mapper, sheet, item_table)
    return kg

def download(data_sheet, yaml_file, wikifier_file, filetype, project_name=""):
    cell_mapper=CacheCellMapper(data_sheet, yaml_file)
    response=dict()
    kg=cell_mapper.result_cacher.get_kg()
    if not kg:
        kg=get_kg(data_sheet, cell_mapper, wikifier_file)
    
    response["data"]=get_file_output_from_statements(kg, filetype)
    response["error"]=None
    response["internalErrors"] = kg.errors if kg.errors else None
    return response

def highlight_region(data_sheet, yaml_file, wikifier_file):
    item_table=get_item_table(wikifier_file, data_sheet)
    cell_mapper=CacheCellMapper(data_sheet, yaml_file)
    highlight_data, statement_data, errors=cell_mapper.result_cacher.get_highlight_region()
    if highlight_data:
        highlight_data['error']=errors if errors else None
        highlight_data['cellStatements']=statement_data
        return highlight_data

    highlight_data = {"dataRegion": set(), "item": set(), "qualifierRegion": set(), 'referenceRegion': set(), 'error': dict()}
    kg=get_kg(data_sheet, cell_mapper, wikifier_file)
    statement_data=kg.statements
    errors=kg.errors
    for cell in statement_data:
        highlight_data["dataRegion"].add(cell)
        statement = statement_data[cell]
        item_cell=statement.get("cell", None)
        if item_cell:
            highlight_data["item"].add(item_cell)
        qualifiers = statement.get("qualifier", None)
        if qualifiers:
            for qualifier in qualifiers:
                qual_cell=qualifier.get("cell", None)
                if qual_cell:
                    highlight_data["qualifierRegion"].add(qual_cell)
    
        references = statement.get("reference", None)
        if references:
            for ref in references:
                ref_cell=ref.get("cell", None)
                if ref_cell:
                    highlight_data["referenceRegion"].add(ref_cell)

    highlight_data['dataRegion'] = list(highlight_data['dataRegion'])
    highlight_data['item'] = list(highlight_data['item'])
    highlight_data['qualifierRegion'] = list(highlight_data['qualifierRegion'])
    highlight_data['referenceRegion'] = list(highlight_data['referenceRegion'])
    cell_mapper.result_cacher.save(highlight_data, statement_data, errors)
    
    highlight_data['error']=errors if errors else None
    highlight_data['cellStatements']=statement_data
    return highlight_data

def get_cell(data_sheet, yaml_file, wikifier_file, col, row):
    item_table=get_item_table(wikifier_file, data_sheet)
    cell_mapper=CacheCellMapper(data_sheet, yaml_file)
    sheet=Sheet(data_sheet.data_file.file_path, data_sheet.name)
    try:
        statement, errors= resolve_cell(cell_mapper, sheet, item_table, col, row)
        data = {'statement': statement, 'internalErrors': errors if errors else None, "error":None}
    except TemplateDidNotApplyToInput as e:
        data=dict(error=e.errors)
    except T2WMLException as e:
        data=dict(error=e.error_dict)
    return data

def table_data(data_file, sheet_name=None):
    sheet_names= [sheet.name for sheet in data_file.sheets]
    if sheet_name is None:
        sheet_name = sheet_names[0]

    data=sheet_to_json(data_file.file_path, sheet_name)
    
    is_csv = True if data_file.extension.lower() == ".csv" else False

    return {
            "filename":data_file.name,
            "isCSV":is_csv,
            "sheetNames": sheet_names,
            "currSheetName": sheet_name,
            "sheetData": data
        }


def create_item_table(wikifier_file, sheet, flag=None):
    item_table=ItemTable()
    item_table.update_table_from_wikifier_file(wikifier_file.file_path, 
                                                sheet.data_file.file_path, 
                                                sheet.name, flag=flag)
    return item_table

def get_item_table(wikifier_file, sheet, flag=None):
    if not wikifier_file:
        return ItemTable(None)

    cache_folder=Path(wikifier_file.file_path).parent/"cache"
    cache_path=cache_folder/(wikifier_file.name+str(wikifier_file.id)+"_"+sheet.name+".json")
    try:
        with open(str(cache_path)) as json_data:
            region_map = json.load(json_data)
            item_table = ItemTable(region_map)
            return item_table
    except (AttributeError, FileNotFoundError, json.decoder.JSONDecodeError):
            if not cache_folder.is_dir():
                cache_folder.mkdir()
            item_table=create_item_table(wikifier_file, sheet, flag=flag)
            item_table.save_to_file(cache_path)
            return item_table



def handle_yaml(sheet, wikifier_file):
    if sheet.yaml_file:
        yaml_file=sheet.yaml_file
        response=dict()
        with open(yaml_file.file_path, "r") as f:
            response["yamlFileContent"]= f.read()
        response['yamlRegions'] = highlight_region(sheet, yaml_file, wikifier_file)
        return response
    return None


def sheet_to_json(data_file_path, sheet_name):
    sheet=Sheet(data_file_path, sheet_name)
    data=sheet.data.copy()
    json_data = {'columnDefs': [{'headerName': "", 'field': "^", 'pinned': "left"}], 
                'rowData': []}
    #get col names
    col_names=[]
    for i in range(len(sheet.data.iloc[0])):
        column = column_index_to_letter(i)
        col_names.append(column)
        json_data['columnDefs'].append({'headerName': column, 'field': column})
    #rename cols
    data.columns=col_names
    #rename rows
    data.index+=1
    #get json
    json_string=data.to_json(orient='table')
    json_dict=json.loads(json_string)
    initial_json=json_dict['data']
    #add the ^ column
    for i, row in enumerate(initial_json):
        row["^"]=str(i+1)
    #add to the response
    json_data['rowData']=initial_json
    return json_data



def serialize_item_table(item_table, sheet):
    serialized_table = {'qnodes': defaultdict(defaultdict), 'rowData': list(), 'error': None}
    items_not_in_wiki = set()

    for context in item_table.lookup_table:
        context_table=item_table.lookup_table[context]
        for str_key in context_table:
            item=context_table[str_key]
            tuple_key=literal_eval(str_key)
            column, row, value = tuple_key

            col = column_index_to_letter(column))
            row = str(row + 1)
            cell = col+row

            serialized_table['qnodes'][cell][context]=  {"item": item}
            row_data = {
                        'context': context,
                        'col': col,
                        'row': row,
                        'value': value,
                        'item': item
                    }


    for cell, desc in item_table.table.items():
        try:
            col = column_index_to_letter(int(cell[0]))
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
                    if item in item_table.item_wiki:
                        row_data['label'] = item_table.item_wiki[item]['label']
                        row_data['desc'] = item_table.item_wiki[item]['desc']
                    else:
                        items_not_in_wiki.add(item)
                    serialized_table['rowData'].append(row_data)
        except Exception as e:
            raise e
        
    if items_not_in_wiki:
        labels_and_descriptions = get_labels_and_descriptions(items_not_in_wiki)
        if labels_and_descriptions:
            item_table.item_wiki.update(labels_and_descriptions)

            # add label and descriptions for items whose label and desc were not in wiki earlier
            for i in range(len(serialized_table['rowData'])):
                if serialized_table['rowData'][i]['item'] in item_table.item_wiki:
                    serialized_table['rowData'][i]['label'] = item_table.item_wiki[serialized_table['rowData'][i]['item']]['label']
                    serialized_table['rowData'][i]['desc'] = item_table.item_wiki[serialized_table['rowData'][i]['item']]['desc']

            for cell, desc in serialized_table["qnodes"].items():
                for context, context_desc in desc.items():
                    if context_desc['item'] in item_table.item_wiki:
                        serialized_table['qnodes'][cell][context]['label'] = item_table.item_wiki[context_desc['item']]['label']
                        serialized_table['qnodes'][cell][context]['desc'] = item_table.item_wiki[context_desc['item']]['desc']
    return serialized_table