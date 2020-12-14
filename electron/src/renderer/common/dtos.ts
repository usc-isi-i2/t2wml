/*
 * Types returned from the server
 */

import { CellSelection } from "./general";

interface SavedStateDTO {
    current_data_file: string;
    current_sheet: string;
    current_wikifiers: string[];
    current_yaml: string;
 }

 interface CurrentAndArrayDTO{
     selected: string,
     val_arr: string[]
 }


export interface ProjectDTO {
    directory: string;
    title: string;
    data_files: { [key: string]: CurrentAndArrayDTO };
    yaml_files: string[];
    wikifier_files: string[];
    entity_files: string[];
    yaml_sheet_associations: { [key: string]: { [key: string] : CurrentAndArrayDTO } };
    sparql_endpoint: string;
    warn_for_empty_cells: boolean;
    datamart_integration: boolean;
    datamart_api: string;
    handle_calendar: string;
    cache_id: string;
    _saved_state: SavedStateDTO;
}

export interface ResponseWithProjectDTO {
    project: ProjectDTO;
}

export interface ResponseWithLayersDTO extends ResponseWithProjectDTO {
    layers: LayersDTO;
    yamlError?: string;
}

export interface ResponseWithTableandMaybeYamlDTO extends ResponseWithLayersDTO {
    table: TableDTO;
    yamlContent?: string;
}

export interface UploadEntitiesDTO extends ResponseWithLayersDTO {
    entitiesStats: EntitiesStatsDTO;
}

export interface CallWikifierServiceDTO extends ResponseWithLayersDTO {
    wikifierError: string;
}

//types:

export interface TableDTO {
    cells: string[][];
    firstRowIndex: number;
    dims: number[];
}

export interface EntitiesStatsDTO {
    added: string[];
    updated: string[];
    failed: string[];
}

export type CellIndex = [number, number];


//layers:

export interface Entry {
    indices: CellIndex[];
}

export type LayerType = "qnode" | "statement" | "error" | "type"| "cleaned";

export interface LayerDTO<T extends Entry> {
    layerType: LayerType;
    entries: T[];
}

export interface QNode{
    label: string
    description: string
    id: string
    url?: string;
}

export interface StatementLayerDTO extends LayerDTO<StatementEntry> {
    qnodes: {[key: string]: QNode };
}

export interface LayersDTO {
    qnode?: LayerDTO<QNodeEntry>;
    statement?: StatementLayerDTO;
    error?: LayerDTO<ErrorEntry>;
    type?: LayerDTO<TypeEntry>;
    cleaned?: LayerDTO<CleanEntry>;
}


export interface QNodeEntry extends Entry, QNode {
    context: string; // null or ""
}

export interface CleanEntry extends Entry {
    cleaned: string;
    original: string;
}

export interface TypeEntry extends Entry {
    type: string;
}

export interface ErrorEntry extends Entry {
    error: any;
}

export interface StatementEntry extends Entry{
    subject: string
    property: string
    cells: any
    value: string
    qnodes: any
    qualifier?: any
    unit?: string
}


export type AnnotationBlockRole = "Dependent Variable" | "Qualifier" | "Metadata" | "Property" | "Main Subject" | "Unit";
export type AnnotationBlockType = "Monolingual String" | "String" | "Quantity" | "Time" | "Q-Node";

export interface AnnotationBlock{
    selections: CellSelection[];
    role: AnnotationBlockRole;
    type?: AnnotationBlockType; 

    language?: string;

    unit?: string;
    //upperBound?: string;
    //lowerBound?: string;

    //latitude?: string;
    //longitude?: string;
    //globe?: string;

    precision?: string;
    calendar?: string;
    format?: string;
    //time_zone?: string;
}

export interface TableCell {
  content: string;
  classNames?: string[];
}
