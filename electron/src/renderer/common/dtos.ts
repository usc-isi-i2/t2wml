/*
 * Types returned from the server
 */

interface SavedStateDTO {
    current_data_file: string;
    current_sheet: string;
    current_wikifiers: string[];
    current_yaml: string;
 }

export interface ProjectDTO {
    directory: string;
    title: string;
    data_files: { [key: string]: string[] };
    yaml_files: string[];
    wikifier_files: string[];
    entity_files: string[];
    yaml_sheet_associations: { [key: string]: { [key: string] : string[] } };
    sparql_endpoint: string;
    warn_for_empty_cells: boolean;
    handle_calendar: string;
    cache_id: string;
    _saved_state: SavedStateDTO;
}


// export interface ColumnDefDTO {
//     headerName: string;
//     field: string;
//     pinned: 'left' | undefined;
//     width?: number;
// }

// export type RowDataDTO = {[key:string]:string};

// export interface SheetDataDTO {
//     columnDefs: ColumnDefDTO[];
//     rowData: RowDataDTO[];
// }

// export interface YamlRegionDTO {
//     type: string;
//     color: string;
//     list: string[];
// }
//
// export interface YamlDataDTO {
//     yamlFileContent: string | undefined;
//     yamlRegions: { [key: string]: YamlRegionDTO };
//
//     // The following are used for debug prints only, so we do not define their content
//     error: { [key: string]: any };
//     cellStatements: { [key: string]: any };
// }
//
// export interface QnodeDataDTO {
//     context: string;
//     col: string;
//     row: string;
//     value: string;
//     item: string;
//     label?: string;
//     description?: string;
// }
//
// export interface QnodeDTO {
//     item: string;
//     label?: string;
//     description?: string;
// }
//
// export interface WikifierDataDTO {
//     qnodes: { [key: string]: { [key: string]: QnodeDTO } }
//     rowData: QnodeDataDTO[];
// }

// export interface TableDataDTO {
//     filename: string;
//     isCSV: boolean;
//     sheetNames: string[];
//     currSheetName: string;
//     sheetData: SheetDataDTO;
// }


interface ResponseWithProjectDTO {
     project: ProjectDTO;
}

export interface ResponseWithLayersDTO extends ResponseWithProjectDTO {
     layers: LayersDTO;
}

export interface UploadDataFileResponseDTO extends ResponseWithLayersDTO {
    table: TableDTO;
}

export interface UploadWikifierOutputResponseDTO extends ResponseWithLayersDTO { }

export interface UploadYamlResponseDTO extends ResponseWithLayersDTO { }

export interface GetProjectResponseDTO extends UploadDataFileResponseDTO {
    yamlContent: string;    
}
export interface ChangeSheetResponseDTO extends GetProjectResponseDTO { }

export interface UploadEntitiesDTO extends ResponseWithLayersDTO {
    entitiesStats: EntitiesStatsDTO;
}

export interface CallWikifierServiceDTO extends ResponseWithLayersDTO {
    wikifierError: WikifierErrorDTO;
}

export type CellIndex = [number, number];
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
    error?: LayerDTO<Entry>;
    type?: LayerDTO<Entry>;
    cleaned?: LayerDTO<CleanEntry>;
}



export interface QNodeEntry extends Entry, QNode {
    context: string; // null or ""
}

export interface CleanEntry extends Entry {
    cleaned: string;
}

export interface StatementEntry extends Entry{
    item: string
    property: string
    cell: string
    value: string
    qnodes: any
    qualifier?: any
    unit?: string
}

export interface TableDTO {
    cells: string[][];
    firstRowIndex: number;
    tableDims: number[];
}

export interface EntitiesStatsDTO {
    added: string[];
    updated: string[];
    failed: string[];
}

export interface WikifierErrorDTO {
    errorCode: number;
    errorTitle: string;
    errorDescription: string;
}
