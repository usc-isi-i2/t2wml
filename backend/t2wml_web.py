from pathlib import Path
import json
from t2wml.api import Sheet, WikifierService, t2wml_settings
from t2wml.spreadsheets.conversions import cell_str_to_tuple
from app_config import db, UPLOAD_FOLDER, CACHE_FOLDER
from wikidata_models import DatabaseProvider
from utils import get_labels_and_descriptions


def wikify(calc_params, region, context):
    ws = WikifierService()
    df, problem_cells = ws.wikify_region(region, calc_params.sheet, context)
    return df, problem_cells


def update_t2wml_settings(project):
    t2wml_settings.sparql_endpoint = project.sparql_endpoint
    t2wml_settings.wikidata_provider = DatabaseProvider(project)
    t2wml_settings.warn_for_empty_cells = project.warn_for_empty_cells
    t2wml_settings.cache_data_files_folder = CACHE_FOLDER


def get_kg(calc_params):
    kg = calc_params.get_kg()
    db.session.commit()  # save any queried properties
    return kg


def download(calc_params, filetype):
    cache_holder = calc_params.cache

    response = dict()
    kg = cache_holder.result_cacher.get_kg()
    if not kg:
        kg = get_kg(calc_params)

    response["data"] = kg.get_output(filetype)
    response["error"] = None
    response["internalErrors"] = kg.errors if kg.errors else None
    return response

def indexer(cell):
    return list(cell_str_to_tuple(cell))

def get_yaml_layers(calc_params):
    qualifierEntry=dict(indices=[], type="qualifier")
    itemEntry=dict(indices=[], type="item")
    dataEntry=dict(indices=[], type="data")
    errorLayer=dict(layerType="error", entries=[])
    statementLayer=dict(layerType="statement", entries=[])
    cleanedLayer=dict(layerType="cleaned", entries=[])

    if calc_params.yaml_path:
        kg = get_kg(calc_params)
        statements=kg.statements
        errors=kg.errors
        
        for cell in errors:
            #todo: convert cell to indices
            errorEntry=dict(indices=[indexer(cell)], error=errors[cell])
            errorLayer["entries"].append(errorEntry)

        for cell in statements:
            dataEntry["indices"].append(indexer(cell))

            statement = statements[cell]
            item_cell = statement.get("cell", None)
            if item_cell:
                itemEntry["indices"].append(indexer(item_cell)) 
            
            qualifiers = statement.get("qualifier", None)
            if qualifiers:
                for qualifier in qualifiers:
                    qual_cell = qualifier.get("cell", None)
                    if qual_cell:
                        qualifierEntry["indices"].append(indexer(qual_cell))
            
            statementEntry=dict(indices=[indexer(cell)])
            statementEntry.update(**statements[cell])
            statementLayer["entries"].append(statementEntry)
        
        #TODO: handle cleaned layer
        
    typeLayer=dict(layerType="type", entries=[qualifierEntry, itemEntry, dataEntry])

    return [errorLayer, statementLayer, cleanedLayer, typeLayer]

def get_yaml_content(calc_params):
    yaml_path = calc_params.yaml_path
    if yaml_path:
        with open(yaml_path, "r", encoding="utf-8") as f:
            yamlFileContent = f.read()
        return yamlFileContent
    return None

class QNode:
    def __init__(self, id, value, context="", label="", description=""):
        self.id = id
        self.value = value
        self.context = context
        self.label = label
        self.description = description

    @property
    def url(self):
        url=""
        first_letter=str(self.id).upper()[0]
        try:
            num=int(self.id[1:])
            if first_letter=="P" and num<10000:
                url="https://www.wikidata.org/wiki/Property:"+self.id
            if first_letter=="Q" and num<1000000000:
                url="https://www.wikidata.org/wiki/"+self.id
        except: #conversion to int failed, is not Pnum or Qnum
            pass
        return url
        

    def update(self, label="", description="", **kwargs):
        self.label=label
        self.description=description


def get_qnodes_layer(calc_params):
    sheet = calc_params.sheet
    wikifier = calc_params.wikifier
    item_table = wikifier.item_table
    qnode_entries=dict()
    if len(item_table.lookup_table):
        ids_to_get = set()
        for col in range(sheet.col_len):
            for row in range(sheet.row_len):
                id, context, value = item_table.get_cell_info(col, row, sheet)
                if id:
                    ids_to_get.add(id)
                    if id in qnode_entries:
                        qnode_entries[id]["indices"].append([col, row])
                    else:
                        qnode_entries[id]=dict(
                            qNode= QNode(id, value, context),
                            indices=[[col, row]])

        labels_and_descriptions = get_labels_and_descriptions(list(ids_to_get), calc_params.sparql_endpoint)
        for id in qnode_entries:
            if id in labels_and_descriptions:
                qnode_entries[id]['qNode'].update(labels_and_descriptions[id])
        
        for id in qnode_entries:
            qNode=qnode_entries[id].pop("qNode")
            qnode_entries[id].update(qNode.__dict__)
    
    return dict(layerType="qNode", entries=list(qnode_entries.values()))


def get_table(calc_params, first_index=0, num_rows=None):
    sheet = calc_params.sheet
    df = sheet.data
    tableDims = list(df.shape)
    
    if num_rows:
        last_index=first_index+num_rows
    else:
        last_index=None
    
    cells = df[first_index:last_index].to_json(orient="values")

    return dict(tableDims=tableDims, firstRowIndex=first_index, cells=cells)


def get_all_layers_and_table(response, calc_params):
    #convenience function for code that repeats three times
    response["table"] = get_table(calc_params)
    qnodes_layer = get_qnodes_layer(calc_params)
    response["layers"]=[qnodes_layer]
    yaml_layers = get_yaml_layers(calc_params)
    response["layers"].extend(yaml_layers)