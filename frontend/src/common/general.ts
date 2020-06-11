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
