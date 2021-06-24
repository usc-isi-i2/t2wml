import os
import json
import re
import numpy as np
import pandas as pd
import zipfile
from t2wml.input_processing.annotation_parsing import create_nodes_from_selection
from t2wml.mapping.canonical_spreadsheet import get_cells_and_columns
from t2wml.api import (WikifierService, t2wml_settings, KnowledgeGraph, YamlMapper, AnnotationMapper,
                        kgtk_to_dict, dict_to_kgtk, Annotation, block_finder, Project)
from t2wml.mapping.kgtk import get_all_variables
from t2wml.mapping.statement_mapper import PartialAnnotationMapper
from t2wml.spreadsheets.conversions import cell_str_to_tuple
from calc_params import CalcParams
from app_config import CACHE_FOLDER
from web_dict_provider import WebDictionaryProvider
from utils import get_empty_layers
from wikidata_utils import get_labels_and_descriptions, get_qnode_url, QNode


def create_api_project(project_folder, title, description, url):
    api_proj = Project(project_folder, title=title, description=description, url=url)
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

def set_web_settings():
    if not os.path.isdir(CACHE_FOLDER):
        os.makedirs(CACHE_FOLDER, exist_ok=True)
    t2wml_settings.cache_data_files_folder = CACHE_FOLDER
    t2wml_settings.wikidata_provider = WebDictionaryProvider()

def update_t2wml_settings(project):
    t2wml_settings.update_from_dict(**project.__dict__)

    #update wikidata provider ONLY if necessary
    if not t2wml_settings.wikidata_provider.project or \
           t2wml_settings.wikidata_provider.project.directory!=project.directory:
                t2wml_settings.wikidata_provider=WebDictionaryProvider(project)
    elif t2wml_settings.wikidata_provider.sparql_endpoint!=project.sparql_endpoint:
                t2wml_settings.wikidata_provider.sparql_endpoint=project.sparql_endpoint


def autocreate_items(calc_params, selection, is_property=False, data_type=None):
    create_nodes_from_selection(selection, calc_params.project, calc_params.sheet, calc_params.wikifier, is_property, data_type)



def get_kg(calc_params):
    wikifier=calc_params.wikifier
    annotation= calc_params.annotation_path
    if calc_params.cache and not annotation:
        kg = calc_params.cache.load_kg()
        if kg:
            return kg
    if annotation:
        cell_mapper = AnnotationMapper(calc_params.annotation_path)
    else:
        cell_mapper = YamlMapper(calc_params.yaml_path)
    with t2wml_settings.wikidata_provider as p:
        kg = KnowledgeGraph.generate(cell_mapper, calc_params.sheet, wikifier)
    return kg




def get_kgtk_download_and_variables(calc_params, validate_for_datamart=False):
    kg = get_kg(calc_params)
    download_output = kg.get_output("tsv", calc_params.project)
    variables=get_all_variables(calc_params.project, kg.statements, validate_for_datamart=validate_for_datamart)
    return download_output, variables



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

        labels_and_descriptions = get_labels_and_descriptions(t2wml_settings.wikidata_provider, list(ids_to_get), calc_params.sparql_endpoint)
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
        "mainSubject":{},
        "dependentVar":{},
        "majorError":{},
        "minorError":{},
        "property":{},
        "unit":{},
        "additionalFields":{}
    }

    errorLayer=dict(layerType="error", entries=[])
    statementLayer=dict(layerType="statement", entries=[])
    cleanedLayer=dict(layerType="cleaned", entries=[])
    qnodes={} #passed by reference everywhere, so gets updated simultaneously across all of them

    if calc_params.yaml_path or calc_params.annotation_path:
        kg = get_kg(calc_params)
        statements=kg.statements
        errors=kg.errors



        for cell_name in errors:
            cell_index=indexer(cell_name)
            errorEntry=dict(indices=[cell_index], error=errors[cell_name])
            errorLayer["entries"].append(errorEntry)


        for cell_name in statements:
            cell_type_indices["dependentVar"][cell_name]=True

            statement = statements[cell_name]
            get_cell_qnodes(statement, qnodes)
            cells=statement["cells"]
            cells.pop("value")
            cells["mainSubject"]=cells.pop("subject")
            for key in cells:
                if key in ["property", "unit", "mainSubject"]:
                    cell_type_indices[key][cells[key]]=True
                else:
                    cell_type_indices["additionalFields"][cells[key]]=True
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
                        if key in ["property", "qualifier", "unit"]:
                            cell_type_indices[key][q_cells[key]]=True
                        else:
                            cell_type_indices["additionalFields"][q_cells[key]]=True
                        #convert to frontend format
                        q_cells[key]=indexer(q_cells[key])
                    cells["qualifiers"].append(q_cells)




            statementEntry=dict(indices=[indexer(cell_name)])#, qnodes=qnodes)
            statementEntry.update(**statements[cell_name])
            statementLayer["entries"].append(statementEntry)



        cleanedLayer=get_cleaned(kg)

        labels = get_labels_and_descriptions(t2wml_settings.wikidata_provider, qnodes, calc_params.project.sparql_endpoint)
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
    #no caching until we've figured out how to make it work
    #if calc_params.yaml_path:
    #    calc_params.cache.save(kg, layers)
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




def get_layers(response, calc_params):
    #convenience function for code that repeats three times
    response["layers"]=get_empty_layers()


    try:
        response["layers"].update(get_yaml_layers(calc_params))
    except Exception as e:
        response["yamlError"] = str(e)

    response["partialCsv"]=dict(dims=[1,3],
                                firstRowIndex=0,
                                cells=[["subject", "property", "value"]])

    response["layers"].update(get_qnodes_layer(calc_params)) #needs to be after layers, since layers can update qnodes

def get_annotations(calc_params):
    annotations_path=calc_params.annotation_path
    try:
        dga = Annotation.load(annotations_path)
    except FileNotFoundError:
        dga=Annotation()
    except Exception as e:
        raise e
    try:
        yamlContent=dga.generate_yaml()[0]
    except Exception as e:
        yamlContent="#Error when generating yaml: "+str(e)
    annotation_block_array = dga.annotation_block_array
    if annotations_path:
        dga.save(annotations_path)
    return annotation_block_array, yamlContent

def suggest_annotations(calc_params):
    annotations_path=calc_params.annotation_path
    dga=Annotation(block_finder(calc_params.sheet))
    if annotations_path:
        dga.save(annotations_path)
    return dga.annotation_block_array


def save_annotations(project, annotation, annotations_path, data_path, sheet_name):
    #temporary fix until we fix in frontend:
    for block in annotation:
        if block["role"] in ["qualifier", "dependentVar"]:
            if not block.get("type"):
                block["type"]="string"

    dga=Annotation(annotation)
    dga.save(annotations_path)
    filename = project.add_annotation_file(annotations_path, data_path, sheet_name)
    project.save()
    return filename



def get_entities(project: Project):
    entity_dict={}
    for file in project.entity_files:
        full_path=project.get_full_path(file)
        entity_dict[file]=kgtk_to_dict(full_path)
    return entity_dict

def update_entities(project, entity_file, updated_entries):

    entities=get_entities(project)[entity_file]
    for entry, new_vals in updated_entries.items():
        entities[entry].update(new_vals)

    entities.update(updated_entries)
    full_path=project.get_full_path(entity_file)
    dict_to_kgtk(entities, full_path)
    return get_entities(project)


def get_partial_csv(calc_params):
    wikifier=calc_params.wikifier
    annotation= calc_params.annotation_path
    cell_mapper = PartialAnnotationMapper(calc_params.annotation_path)
    kg = KnowledgeGraph.generate(cell_mapper, calc_params.sheet, wikifier, start=0, end=150)
    if not kg.statements:
        if cell_mapper.annotation.subject_annotations:
            df=pd.DataFrame([], columns=["subject", "property", "value"])
            subject_cells=[]
            (x1, y1),(x2, y2)=subject_block_cells=cell_mapper.annotation.subject_annotations[0].cell_args
            for row in range(y1, y2+1):
                for col in range(x1, x2+1):
                    subject_cells.append(calc_params.sheet[row, col])
            df.subject=subject_cells


    else:
        columns, dict_values=get_cells_and_columns(kg.statements, calc_params.project)
        df = pd.DataFrame.from_dict(dict_values)
        df.replace(to_replace=[None], value="", inplace=True)
        df = df[columns] # sort the columns
    dims = list(df.shape)
    cells = json.loads(df.to_json(orient="values"))
    cells.insert(0, list(df.columns))
    return dict(dims=dims, firstRowIndex=0, cells=cells)



def create_zip(project, filetype, filestream):
        with zipfile.ZipFile(filestream, mode='w', compression=zipfile.ZIP_DEFLATED) as zf:
            internalErrors = []
            for filename, df in project.annotations.items():
                for sheet_name, sheet in df.items():
                    calc_params = CalcParams(project, filename, sheet_name)
                    for annotation_file in sheet["val_arr"]:
                        calc_params._annotation_path = annotation_file
                        try:
                            kg = get_kg(calc_params)
                        except:
                            internalErrors.append(
                                f"failed to generate kg for {filename} {sheet_name} {annotation_file}")
                            kg = None

                        if kg:
                            if kg.statements:
                                zip_filename = filename + "_" + sheet_name + "_a_" + annotation_file
                                zip_filename= re.sub(r'[^A-Za-z0-9\s]+', '_', zip_filename)
                                zip_filename = zip_filename + "." + filetype
                                output = kg.get_output(filetype, calc_params.project)
                                zf.writestr(zip_filename, output)
                            if kg.errors:
                                internalErrors.append(kg.errors)

            for filename, df in project.yaml_sheet_associations.items():
                for sheet_name, sheet in df.items():
                    calc_params = CalcParams(project, filename, sheet_name)
                    for yaml_file in sheet["val_arr"]:
                        calc_params._yaml_path = yaml_file
                        try:
                            kg = get_kg(calc_params)
                        except:
                            internalErrors.append(
                                f"failed to generate kg for {filename} {sheet_name} {yaml_file}")
                            kg = None

                        if kg:
                            zip_filename = filename + "_" + sheet_name + "_y_" + yaml_file
                            zip_filename= re.sub(r'[^A-Za-z0-9\s]+', '_', zip_filename)
                            zip_filename = zip_filename + "." + filetype
                            output = kg.get_output(filetype, calc_params.project)
                            zf.writestr(zip_filename, output)
                            if kg.errors:
                                internalErrors.append(kg.errors)
            if internalErrors:
                zf.writestr("errors.json", json.dumps(internalErrors))
        return filestream
