/*
 * Types returned from the server
 */

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
    _saved_state: any;
 }

 export interface SettingsDTO {
     endpoint: string;
     warnEmpty: boolean;
 }

export interface ColumnDefDTO {
    headerName: string;
    field: string;
    pinned: 'left' | undefined;
    width?: number;
}

export type RowDataDTO = {[key:string]:string};

export interface SheetDataDTO {
    columnDefs: ColumnDefDTO[];
    rowData: RowDataDTO[];
}

export interface YamlRegionDTO {
    type: string;
    color: string;
    list: string[];
}

export interface YamlDataDTO {
    yamlFileContent: string | undefined;
    yamlRegions: { [key: string]: YamlRegionDTO };

    // The following are used for debug prints only, so we do not define their content
    error: { [key: string]: any };
    cellStatements: { [key: string]: any };
}

export interface QnodeDataDTO {
    context: string;
    col: string;
    row: string;
    value: string;
    item: string;
    label?: string;
    description?: string;
}

export interface QnodeDTO {
    item: string;
    label?: string;
    description?: string;
}

export interface WikifierDataDTO {
    qnodes: { [key: string]: { [key: string]: QnodeDTO } }
    rowData: QnodeDataDTO[];
}

export interface TableDataDTO {
    filename: string;
    isCSV: boolean;
    sheetNames: string[];
    currSheetName: string;
    sheetData: SheetDataDTO;
}

export interface UploadDataFileResponseDTO {
    tableData: TableDataDTO;
    wikifierData: WikifierDataDTO;
    yamlData: YamlDataDTO;
    error: any;
}

export interface ChangeSheetResponseDTO {
    tableData: TableDataDTO;
    wikifierData: WikifierDataDTO;
    yamlData: YamlDataDTO;
}

export interface UploadWikifierOutputResponseDTO {
    rowData: RowDataDTO;
    qnodes: QnodeDTO;
    project: ProjectDTO;
    error: any;
}

export interface UploadYamlResponseDTO {
    yamlRegions: YamlRegionDTO;
    project: ProjectDTO;
    error: any;
}

export interface GetProjectFilesResponseDTO {
    name: string;
    tableData: TableDataDTO;
    yamlData: YamlDataDTO;
    wikifierData: WikifierDataDTO;
}