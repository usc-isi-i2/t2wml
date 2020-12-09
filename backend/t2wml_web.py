from collections import defaultdict
import os
import json
import numpy as np
from pathlib import Path
from t2wml.api import add_entities_from_file as api_add_entities_from_file
from t2wml.api import WikifierService, t2wml_settings, KnowledgeGraph, YamlMapper
from t2wml.utils.t2wml_exceptions import T2WMLException
from t2wml.spreadsheets.conversions import cell_str_to_tuple
try:
    from t2wml.api import ProjectWithSavedState as Project
except:
    from t2wml.api import Project
from app_config import db, CACHE_FOLDER
from database_provider import DatabaseProvider
from utils import get_empty_layers
from wikidata_utils import get_labels_and_descriptions, get_qnode_url, QNode



def add_entities_from_project(project):
    for f in project.entity_files:
        api_add_entities_from_file(Path(project.directory) / f)

def add_entities_from_file(file_path):
    return api_add_entities_from_file(file_path)

def create_api_project(project_folder):
    api_proj = Project(project_folder)
    api_proj.title = Path(project_folder).stem
    api_proj.save()
    return api_proj

def get_project_instance(project_folder):
    project = Project.load(project_folder)
    update_t2wml_settings(project)
    return project

def wikify(calc_params, region, context):
    ws = WikifierService()
    df, problem_cells = ws.wikify_region(region, calc_params.sheet, context)
    return df, problem_cells


def update_t2wml_settings(project):
    if not os.path.isdir(CACHE_FOLDER):
        os.makedirs(CACHE_FOLDER, exist_ok=True)
    t2wml_settings.cache_data_files_folder = CACHE_FOLDER
    t2wml_settings.wikidata_provider = DatabaseProvider(project)
    t2wml_settings.update_from_dict(**project.__dict__)



def get_kg(calc_params):
    if calc_params.cache:
        kg = calc_params.cache.load_kg()
        if kg:
            return kg
    cell_mapper = YamlMapper(calc_params.yaml_path)
    kg = KnowledgeGraph.generate(cell_mapper, calc_params.sheet, calc_params.wikifier)
    db.session.commit()  # save any queried properties
    return kg


def download(calc_params, filetype):
    response = dict()
    kg = get_kg(calc_params)
    response["data"] = kg.get_output(filetype)
    response["error"] = None
    response["internalErrors"] = kg.errors if kg.errors else None
    return response



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
                        qnode_entries[id]["indices"].append([row, col])
                    else:
                        qnode_entries[id]=dict(
                            qNode= QNode(id, value, context),
                            indices=[[row, col]])

        labels_and_descriptions = get_labels_and_descriptions(list(ids_to_get), calc_params.sparql_endpoint)
        for id in qnode_entries:
            if id in labels_and_descriptions:
                qnode_entries[id]['qNode'].update(**labels_and_descriptions[id])
        
        for id in qnode_entries:
            qNode=qnode_entries[id].pop("qNode")
            qnode_entries[id].update(qNode.__dict__)
    
    return {"qnode": dict(layerType="qNode", entries=list(qnode_entries.values()))}



def indexer(cell):
    col, row = cell_str_to_tuple(cell)
    return [row, col]

def get_cleaned(kg):
    cleanedLayer=dict(layerType="cleaned", entries=[])
    if kg.sheet:
        cleaned_data=kg.sheet.cleaned_data
        if cleaned_data is not None: 
            comparison=cleaned_data.ne(kg.sheet.raw_data)
            comparison=comparison.to_numpy()
            changed_values = np.argwhere(comparison)
            for entry in changed_values:
                new_value = cleaned_data.iloc[entry[0], entry[1]]
                old_value = kg.sheet.raw_data.iloc[entry[0], entry[1]]
                entry=dict(indices=[[entry[0], entry[1]]], cleaned=new_value, original=old_value)
                cleanedLayer["entries"].append(entry)
    return cleanedLayer

def get_cell_qnodes(statement, qnodes):
        # get cell qnodes	
        for outer_key, outer_value in statement.items():	
            if outer_key == "qualifier":	
                for qual_dict in outer_value:	
                    for inner_key, inner_value in qual_dict.items():	
                        if str(inner_value).upper()[0] in ["P", "Q"]:	
                            qnodes[str(inner_value)] = None	
            else:	
                if str(outer_value).upper()[0] in ["P", "Q"]:	
                    qnodes[str(outer_value)] = None	


def get_yaml_layers(calc_params):
    if calc_params.cache:
        layers=calc_params.cache.get_layers()
        if layers:
            return layers
    

    cell_type_indices={
        "qualifier":{},
        "subject":{},
        "data":{},
        "majorError":{},
        "minorError":{},
        "property":{},
        "metadata":{}
    }

    errorLayer=dict(layerType="error", entries=[])
    statementLayer=dict(layerType="statement", entries=[])
    cleanedLayer=dict(layerType="cleaned", entries=[])
    qnodes={} #passed by reference everywhere, so gets updated simultaneously across all of them

    if calc_params.yaml_path:
        kg = get_kg(calc_params)
        statements=kg.statements
        errors=kg.errors
        

        
        for cell_name in errors:
            cell_index=indexer(cell_name)
            errorEntry=dict(indices=[cell_index], error=errors[cell_name])
            errorLayer["entries"].append(errorEntry)

            if len(set(["property", "value", "subject", "fatal"]).intersection(errors[cell_name].keys())):	
                cell_type_indices["majorError"][cell_name]=True
            else:	
                cell_type_indices["minorError"][cell_name]=True


        for cell_name in statements:
            cell_type_indices["data"][cell_name]=True

            statement = statements[cell_name]
            get_cell_qnodes(statement, qnodes)
            cells=statement["cells"]
            cells.pop("value")
            for key in cells:
                if key in ["subject", "property"]:
                    cell_type_indices[key][cells[key]]=True
                else:
                    cell_type_indices["metadata"][cells[key]]=True
                #convert to frontend format
                cells[key]=indexer(cells[key])
            cells["qualifiers"]=[]

            qualifiers = statement.get("qualifier", None)
            if qualifiers:
                for qualifier in qualifiers:
                    q_cells=qualifier.pop("cells", None)
                    qual_cell = q_cells.pop("value", None)
                    if qual_cell:
                        q_cells["qualifier"]=qual_cell
                        
                    for key in q_cells:
                        if key in ["property", "qualifier"]:
                            cell_type_indices[key][q_cells[key]]=True
                        else:
                            cell_type_indices["metadata"][q_cells[key]]=True
                        #convert to frontend format
                        q_cells[key]=indexer(q_cells[key])
                    cells["qualifiers"].append(q_cells)
                        


            
            statementEntry=dict(indices=[indexer(cell_name)])#, qnodes=qnodes)
            statementEntry.update(**statements[cell_name])
            statementLayer["entries"].append(statementEntry)
        


        cleanedLayer=get_cleaned(kg)

        labels = get_labels_and_descriptions(qnodes, calc_params.project.sparql_endpoint)	
        qnodes.update(labels)	
        for id in qnodes:
            if qnodes[id]:
                qnodes[id]["url"]=get_qnode_url(id)
                qnodes[id]["id"]=id
        
        statementLayer["qnodes"]=qnodes

    type_entries=[]
    for key in cell_type_indices:
        indices = [indexer(cell_name) for cell_name in cell_type_indices[key]]
        type_entries.append(dict(type=key, indices=indices))
    typeLayer=dict(layerType="type", entries=type_entries)

    layers= dict(error= errorLayer, 
            statement= statementLayer, 
            cleaned= cleanedLayer, 
            type = typeLayer)
    if calc_params.yaml_path:
        calc_params.cache.save(kg, layers)
    return layers



def get_table(calc_params, first_index=0, num_rows=None):
    sheet = calc_params.sheet
    if not sheet:
        raise ValueError("Calc params does not have sheet loaded")
    df = sheet.data
    dims = list(df.shape)
    
    if num_rows:
        last_index=first_index+num_rows
    else:
        last_index=None

    #There's no need to check for overflow, as pandas handles that automatically
    cells = json.loads(df[first_index:last_index].to_json(orient="values"))

    return dict(dims=dims, firstRowIndex=first_index, cells=cells)




def get_all_layers_and_table(response, calc_params):
    #convenience function for code that repeats three times
    response["layers"]=get_empty_layers()

    response["table"] = get_table(calc_params)
    response["layers"].update(get_qnodes_layer(calc_params))

    try:
        response["layers"].update(get_yaml_layers(calc_params))
    except Exception as e:
        response["yamlError"] = str(e)


def get_annotations(project, annotation):
    from t2wml.input_processing.annotation_parsing import DynamicallyGeneratedAnnotation
    annotations_dir=os.path.join(project.directory, "annotations")
    if not os.path.isdir(annotations_dir):
        os.mkdir(annotations_dir)
    annotations_path=os.path.join(annotations_dir, Path(project.current_data_file).stem+"_"+project.current_sheet+".json")
    try:
        dga = DynamicallyGeneratedAnnotation.load(annotations_path)
    except FileNotFoundError:
        dga=DynamicallyGeneratedAnnotation()
    
    dga.add_annotation(annotation)
    dga.save(annotations_path)

    layers=get_empty_layers()
    return_dict=dict(annotations=dga.__dict__, yamlContent=dga.generate_yaml()[0], layers=layers)
    return return_dict