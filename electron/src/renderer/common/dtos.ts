/*
 * Types returned from the server
 */

export interface ColumnDef {
    headerName: string;
    filled: string;
    pinned: 'left' | undefined;
}

export type RowDataDTO = {[key:string]:string};

export interface SheetData {
    columnDefs: ColumnDef[];
    rowData: RowDataDTO[];
}

export interface YamlRegion {
    type: string;
    color: string;
    list: string[];
}

export interface YamlData {
    yamlFileContent: string | undefined;
    yamlRegions: { [key: string]: YamlRegion };

    // The following are used for debug prints only, so we do not define their content
    error: { [key: string]: any };
    cellStatements: { [key: string]: any };
}

export interface QnodeData {
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

export interface WikifierData {
    qnodes: { [key: string]: { [key: string]: QnodeDTO } }
    rowData: QnodeData[];
}

export interface TableData {
    filename: string;
    isCSV: boolean;
    sheetNames: string[];
    currSheetName: string;
    sheedData: SheetData;
}

export interface t2wmlResultDTO {
    name: string;
    tableData: TableData | null;
    yamlData: YamlData | null;
    wikifierData: WikifierData | null;
}