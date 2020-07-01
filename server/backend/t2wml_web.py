import json
from t2wml.mapping.t2wml_handling import get_all_template_statements, get_file_output_from_data, resolve_cell
from t2wml.utils.t2wml_exceptions import T2WMLException, TemplateDidNotApplyToInput
from t2wml.settings import t2wml_settings
from app_config import DEFAULT_SPARQL_ENDPOINT
from wikidata_property import DatabaseProvider

def update_t2wml_settings():
    t2wml_settings.update({
                "cache_data_files":True,
                "cache_results":True,
                "wikidata_provider":DatabaseProvider(DEFAULT_SPARQL_ENDPOINT),
                #"sparql_endpoint":project.sparql_endpoint,
                #"storage_folder":UPLOAD_FOLDER
                })

def download(cell_mapper, filetype, project_name="", file_path=None, sheet_name=None):
    response=dict()
    errors=[]
    data=[]
    if cell_mapper.use_cache:
        data, errors=cell_mapper.result_cacher.get_download()
    if not data:
        data, errors = get_all_template_statements(cell_mapper)
    
    response["data"]=get_file_output_from_data(data, filetype, project_name, file_path, sheet_name, cell_mapper.created_by)
    response["error"]=None
    response["internalErrors"] = errors
    return response

def highlight_region(cell_mapper):
    if cell_mapper.use_cache:
        highlight_data=cell_mapper.result_cacher.get_highlight_region()
        if highlight_data:
            return highlight_data

    highlight_data = {"dataRegion": set(), "item": set(), "qualifierRegion": set(), 'referenceRegion': set(), 'error': dict()}
    statement_data, errors= get_all_template_statements(cell_mapper)
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

    if cell_mapper.use_cache:
        cell_mapper.result_cacher.save(highlight_data, statement_data, errors)
    return highlight_data


def handle_yaml(sheet):
    if sheet.yaml_file:
        yaml_file=sheet.yaml_file
        try:
            response=dict()
            with open(yaml_file.yaml_file_path, "r") as f:
                response["yamlFileContent"]= f.read()
            response['yamlRegions'] = highlight_region(yaml_file.cell_mapper)
            return response
        except Exception as e:
            return None #TODO: can't return a better error here yet, it breaks the frontend
    return None

def get_cell(cell_mapper, col, row):
    try:
        statement, errors= resolve_cell(cell_mapper, col, row)
        data = {'statement': statement, 'internalErrors': errors if errors else None, "error":None}
    except TemplateDidNotApplyToInput as e:
        data=dict(error=e.errors)
    except T2WMLException as e:
        data=dict(error=e.error_dict)
    return data