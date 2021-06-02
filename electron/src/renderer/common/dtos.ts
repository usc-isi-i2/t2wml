/*
 * Types returned from the server
 */

import { CellSelection } from "./general";

/* base types*/

 interface CurrentAndArrayDTO{
     selected: string;
     val_arr: string[];
 }

export interface ProjectDTO {
    directory: string;
    title: string;
    data_files: { [key: string]: CurrentAndArrayDTO };
    yaml_files: string[];
    wikifier_files: string[];
    entity_files: string[];
    yaml_sheet_associations: { [key: string]: { [key: string] : CurrentAndArrayDTO } };
    annotations: { [key: string]: { [key: string] : CurrentAndArrayDTO } };
    sparql_endpoint: string;
    warn_for_empty_cells: boolean;
    handle_calendar: string;
    cache_id: string;
    url: string;
    description: string;
}

export interface GlobalSettingsDTO {
    datamart_api: string;
}

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

export type CellIndex = [number, number]; //row, col


//layers:

export interface Entry {
    indices: CellIndex[];
}

export type LayerType = "qnode" | "statement" | "error" | "type"| "cleaned";

export interface LayerDTO<T extends Entry> {
    layerType: LayerType;
    entries: T[];
}

export interface WikiNode{
    label: string;
    description: string;
    id: string;
    url?: string;

    //if a property
    data_type?: string;
    tags?: string[];
    is_property?: boolean; //is never returned from backend, but more convenient to stick here
}


export interface StatementLayerDTO extends LayerDTO<StatementEntry> {
    qnodes: {[key: string]: WikiNode };
}

export interface LayersDTO {
    qnode?: LayerDTO<QNodeEntry>;
    statement?: StatementLayerDTO;
    error?: LayerDTO<ErrorEntry>;
    type?: LayerDTO<TypeEntry>;
    cleaned?: LayerDTO<CleanEntry>;
}


export interface QNodeEntry extends Entry, WikiNode {
    context: string; // null or ""
}

export interface CleanEntry extends Entry {
    cleaned: string;
    original: string;
}

export interface TypeEntry extends Entry {
    type: string;
}

export type ErrorRole= "value"|"qualifier"|"property"|"subject"|"unit"

export interface Error{
    role: ErrorRole;
    message: string;
    qualifier_index: number;
    level: "Major"|"Minor";
    field: string; //can be role, but could also be "calendar" or any other yaml key
}


export interface ErrorEntry extends Entry {
    error: Error[];
}

export interface StatementEntry extends Entry{
    subject: string;
    property: string;
    cells: any;
    value: string;
    qnodes: any;
    qualifier?: any;
    unit?: string;
    precision?: number;
}


export type AnnotationBlockRole = "dependentVar" | "qualifier" | "metadata" | "property" | "mainSubject" | "unit";
export type AnnotationBlockType = "string" | "quantity" | "time" | "wikibaseitem";


export interface EntityFields {
    isProperty: boolean;
    label: string;
    description: string;
    dataType: string;
}

export interface AnnotationBlock{
    selection: CellSelection;
    role: AnnotationBlockRole;
    type?: AnnotationBlockType;

    language?: string;

    unit?: string;
    subject?: string;
    property?: string;
    links?: {
        property?: string;// the ID of the block with the property of this block
        mainSubject?: string; // the ID of the block with the subject of this block
        unit?: string;
    };
    link?: string;

    //upperBound?: string;
    //lowerBound?: string;

    //latitude?: string;
    //longitude?: string;
    //globe?: string;

    precision?: string;
    calendar?: string;
    format?: string;
    id?: string;
    //time_zone?: string;
}

export interface TableCell {
  rawContent?: string;
  content: string | JSX.Element;
  classNames: string[];
}

export type TableData = TableCell[][];


/* responses: */



export interface ResponseWithProjectDTO {
    project: ProjectDTO;
}

export interface ResponseWithProjectandFileName extends ResponseWithProjectDTO{
    filename: string;
}

export interface ResponseWithPartialCsvDTO{
    partialCsv: TableDTO;
}

export interface ResponseWithAnnotationsDTO{
    annotations: AnnotationBlock[];
    yamlContent: string;
}

export interface ResponseWithMappingDTO{
    project: ProjectDTO;
    layers: LayersDTO;
    yamlContent: string;
    yamlError?: string;
    annotations: AnnotationBlock[];
}

export interface ResponseWithTableDTO extends ResponseWithMappingDTO{
    table: TableDTO;
}

export interface ResponseWithQNodeLayerDTO extends ResponseWithProjectDTO{
    layers: LayersDTO; //only contains the qnode layer, but leaving it like this for now
}

export interface ResponseUploadEntitiesDTO extends ResponseWithQNodeLayerDTO {
    entitiesStats: EntitiesStatsDTO;
}

export interface ResponseEntitiesPropertiesDTO {
    [file: string]: { [property: string] : WikiNode };
}

export interface ResponseCallWikifierServiceDTO extends ResponseWithQNodeLayerDTO {
    wikifierError: string;
}

export interface ResponseWithProjectAndMappingDTO extends ResponseWithProjectDTO, ResponseWithMappingDTO{

}

export interface ResponseWithEverythingDTO extends ResponseWithProjectDTO, ResponseWithTableDTO{

}

export interface ResponseWithQNodesDTO {
    qnodes: WikiNode[];
}

export interface ResponseWithSuggestion {
    role: string;
    type?: string;
    children: any;
}

export interface ResponseWithQNodeLayerAndId extends ResponseWithQNodeLayerDTO{
    id: string;
}
