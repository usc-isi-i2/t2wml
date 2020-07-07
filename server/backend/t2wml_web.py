import json
from pathlib import Path

from t2wml.mapping.t2wml_handling import get_all_template_statements, resolve_cell
from t2wml.mapping.download import get_file_output_from_statements
from t2wml.utils.t2wml_exceptions import T2WMLException, TemplateDidNotApplyToInput
from t2wml.settings import t2wml_settings
from t2wml.api import set_sparql_endpoint, set_wikidata_provider
from t2wml.spreadsheets.sheet import Sheet
from t2wml.spreadsheets.conversions import _column_index_to_letter
from t2wml.wikification.item_table import ItemTable
from t2wml.wikification.wikify_handling import wikifier
from caching import CacheCellMapper
from app_config import DEFAULT_SPARQL_ENDPOINT
from wikidata_property import DatabaseProvider

def wikify(region, filepath, sheet_name, context):
    return wikifier(region, filepath, sheet_name, context)

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

def download(sheet, yaml_file, item_table, filetype, project_name=""):
    cell_mapper=CellMapper(sheet, yaml_file, item_table)
    response=dict()
    errors=[]
    statements, errors=cell_mapper.result_cacher.get_download()
    if not statements:
        statements, errors = get_all_template_statements(cell_mapper, sheet, item_table)
    
    response["data"]=get_file_output_from_statements(statements, filetype, project_name, sheet.data_file.name, sheet.name, cell_mapper.template.created_by)
    response["error"]=None
    response["internalErrors"] = errors
    return response

def highlight_region(sheet, yaml_file, item_table):
    cell_mapper=CellMapper(sheet, yaml_file, item_table)
    highlight_data=cell_mapper.result_cacher.get_highlight_region()
    if highlight_data:
        return highlight_data

    highlight_data = {"dataRegion": set(), "item": set(), "qualifierRegion": set(), 'referenceRegion': set(), 'error': dict()}
    statement_data, errors= get_all_template_statements(cell_mapper, sheet, item_table)
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
    highlight_data['error']=errors if errors else None

    cell_mapper.result_cacher.save(highlight_data, statement_data, errors)
    return highlight_data

def get_cell(sheet, yaml_file, item_table, col, row):
    cell_mapper=CellMapper(sheet, yaml_file, item_table)
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



def handle_yaml(sheet, item_table=None):
    if sheet.yaml_file:
        yaml_file=sheet.yaml_file
        response=dict()
        with open(yaml_file.file_path, "r") as f:
            response["yamlFileContent"]= f.read()
        response['yamlRegions'] = highlight_region(sheet, yaml_file, item_table)
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
        column = _column_index_to_letter(i)
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