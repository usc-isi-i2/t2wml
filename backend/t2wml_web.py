import json
from pathlib import Path
from collections import defaultdict
from t2wml.utils.t2wml_exceptions import T2WMLException, TemplateDidNotApplyToInput
from t2wml.settings import t2wml_settings
from t2wml.api import set_sparql_endpoint, set_wikidata_provider, Sheet, KnowledgeGraph, Wikifier, WikifierService
from t2wml.spreadsheets.conversions import column_index_to_letter, to_excel, column_letter_to_index
 
from caching import CacheHolder
from app_config import DEFAULT_SPARQL_ENDPOINT, db
from wikidata_models import DatabaseProvider
from utils import get_labels_and_descriptions

def wikify(region, data_sheet, context):
    ws=WikifierService()
    sheet=Sheet(data_sheet.data_file.file_path, data_sheet.name)
    df, problem_cells= ws.wikify_region(region, sheet, context)
    return df, problem_cells

def update_t2wml_settings(project):
    set_sparql_endpoint(project.sparql_endpoint)
    set_wikidata_provider(DatabaseProvider(project.sparql_endpoint))
    t2wml_settings.update({
                "cache_data_files":True,
                #"wikidata_provider":DatabaseProvider(DEFAULT_SPARQL_ENDPOINT),
                #"sparql_endpoint":project.sparql_endpoint,
                #"storage_folder":UPLOAD_FOLDER
                })


def get_wikifier(project):
    #one day this will handle multiple wikifier files
    wikifier=Wikifier()
    if project.wikifier_file:
        wikifier.add_file(project.wikifier_file.file_path)
    return wikifier

def get_kg(data_sheet, cell_mapper, project):
    wikifier=get_wikifier(project)
    sheet=Sheet(data_sheet.data_file.file_path, data_sheet.name)
    kg=KnowledgeGraph.generate(cell_mapper, sheet, wikifier)
    db.session.commit() #save any queried properties
    return kg

def download(data_sheet, yaml_file, project, filetype, project_name=""):
    cache_holder=CacheHolder(data_sheet, yaml_file)
    response=dict()
    kg=cache_holder.result_cacher.get_kg()
    if not kg:
        kg=get_kg(data_sheet, cache_holder.cell_mapper, project)
    
    response["data"]=kg.get_output(filetype)
    response["error"]=None
    response["internalErrors"] = kg.errors if kg.errors else None
    return response

def highlight_region(data_sheet, yaml_file, project):
    cache_holder=CacheHolder(data_sheet, yaml_file)
    highlight_data, statement_data, errors=cache_holder.result_cacher.get_highlight_region()
    if highlight_data:
        highlight_data['error']=errors if errors else None
        highlight_data['cellStatements']=statement_data
        return highlight_data

    highlight_data = {"dataRegion": set(), "item": set(), "qualifierRegion": set(), 'referenceRegion': set(), 'error': dict()}
    kg=get_kg(data_sheet, cache_holder.cell_mapper, project)
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
    
    #handle error colors:
    orange='FF8000'
    red="FF3333"
    highlight_data['error']=errors if errors else None
    highlight_data[orange]=[]
    highlight_data[red]=[]
    for cell in errors:
        if len(set(["property", "value", "item"]).intersection(errors[cell].keys())):
            highlight_data[red].append(cell)
        else:
            highlight_data[orange].append(cell)
    
    cache_holder.result_cacher.save(highlight_data, statement_data, errors)

    highlight_data['cellStatements']=statement_data
    return highlight_data

def get_cell(data_sheet, yaml_file, project, col, row):
    wikifier=get_wikifier(project)
    cache_holder=CacheHolder(data_sheet, yaml_file)
    sheet=Sheet(data_sheet.data_file.file_path, data_sheet.name)
    try:
        row=int(row)
        col=column_letter_to_index(col)+1
        statement, errors= cache_holder.cell_mapper.get_cell_statement(sheet, wikifier, col, row)
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


def handle_yaml(sheet, project):
    if sheet.yaml_file:
        yaml_file=sheet.yaml_file
        response=dict()
        with open(yaml_file.file_path, "r") as f:
            response["yamlFileContent"]= f.read()
        response['yamlRegions'] = highlight_region(sheet, yaml_file, project)
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



def serialize_item_table(project, sheet):
    sheet=Sheet(sheet.data_file.file_path, sheet.name)
    wikifier=get_wikifier(project)
    item_table=wikifier.item_table
    qnodes=defaultdict(defaultdict)
    rowData=list()
    items_to_get = set()

    for col in range(sheet.col_len):
        for row in range(sheet.row_len):
            item, context, value=item_table.get_cell_info(col, row, sheet)
            if item:
                items_to_get.add(item)
                #rowData:
                row_data = {
                        'context': context,
                        'col': column_index_to_letter(int(col)),
                        'row': str(int(row) + 1),
                        'value': value,
                        'item': item
                    }
                rowData.append(row_data)
                #qnodes:
                cell=to_excel(col, row)
                qnodes[cell][context]=  {"item": item}
    
    labels_and_descriptions = get_labels_and_descriptions(list(items_to_get))

    #update rowData
    for i in range(len(rowData)):
        item_key=rowData[i]['item']
        if item_key in labels_and_descriptions:
            label=labels_and_descriptions[item_key]['label']
            desc=labels_and_descriptions[item_key]['desc']
            rowData[i]['label'] = label
            rowData[i]['desc'] = desc

    #qnodes
    for cell, con in qnodes.items():
        for context, context_desc in con.items():
            item_key=context_desc['item']
            if item_key in labels_and_descriptions:
                label=labels_and_descriptions[item_key]['label']
                desc=labels_and_descriptions[item_key]['desc']
                qnodes[cell][context]['label'] = label
                qnodes[cell][context]['desc'] = desc

    serialized_table = {'qnodes': qnodes, 'rowData': rowData}
    return serialized_table