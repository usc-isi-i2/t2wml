// console.log
export const LOG = {
    default: "background: ; color: ",
    highlight: "background: yellow; color: black",
    link: "background: white; color: blue"
};

export interface gridApiInterface {
    api: any;
    columnApi: any;
}

export interface ErrorMessage {
    errorCode: number;
    errorTitle: string;
    errorDescription: string;
}


export class Cell {
    col: number | null = null;
    row: number | null = null;
    value: string | null = null;

    constructor(col?: number | null, row?: number | null, value?: string | null) {
        if (col!=null && row!=null) {
            this.col = col;
            this.row = row;
        }
        if (value == undefined) {
            this.value = null;
        }
        else {
            this.value = value
        }
    }

    get isCell(): boolean{
        if (this.col!=null && this.row!=null){
            return true;
        }
        return false;
    }

}

export enum t2wmlColors {
    PROJECT = "#f8f9fa",
    TABLE = "#339966",
    WIKIFIER = "#006699",
    YAML = "#006699",
    OUTPUT = "#990000"
}
