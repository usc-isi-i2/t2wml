import { colName2colIdx } from "./utils";


// console.log
export const LOG = {
    default: "background: ; color: ",
    highlight: "background: yellow; color: black",
    link: "background: white; color: blue"
};

export interface WikifierData {
    api: any;
    columnApi: any;
}

export interface ErrorMessage {
    errorCode: number;
    errorTitle: string;
    errorDescription: string;
}

interface ErrorCellData {
    ["item"]?: string;
    ["qualifier"]?: {
        [key: string]: {
            ["value"]?: string;
            ["time parsing"]?: string;
        };
    };
}

// export interface ErrorCell {
//     [key: string] : ErrorCellData;   
// }

export class Cell {
    col: string | null = null;
    row: number | null = null;
    value: string | null = null;

    get rowIndex(): number | null {
        if (this.row) { return this.row - 1; }
        return null;
    }

    get colIndex(): number | null {
        if (this.col) { 
            return colName2colIdx(this.col)-1;
        }
        return null;
    }

}
