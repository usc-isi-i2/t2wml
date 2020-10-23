import React, { Component } from 'react';

import { Button, Card, OverlayTrigger, Spinner, Tooltip } from 'react-bootstrap';

import { LOG, WikifierData, ErrorMessage, Cell } from '../../common/general';
import ToastMessage from '../../common/toast';

import { observer } from "mobx-react";
import wikiStore from '../../data/store';
import { IReactionDisposer, reaction } from 'mobx';


interface Column {
  headerName: string;
  field: string;
  pinned?: string; // "left" | "right";
  width?: number;
}


interface TableData {
  filename: string;
  isCSV: boolean;
  sheetNames: Array<string>;
  currSheetName: string;
  columnDefs: Array<string>;
  rowData: string;
  sheetData: any;
}


interface TableState {
  showSpinner: boolean;

  // table data
  filename: string | null,       // if null, show "Table Viewer"
  isCSV: boolean,         // csv: true   excel: false
  sheetNames: Array<string> | null,     // csv: null    excel: [ "sheet1", "sheet2", ... ]
  currSheetName: string | null,  // csv: null    excel: "sheet1"
  columnDefs:  Array<Column>;
  rowData: any; // Array<object>; // todo: add interface
  selectedCell: Cell | null;
  yamlRegions: any; // null,

  errorMessage: ErrorMessage;
}


@observer
class TableComponent extends Component<{}, TableState> {

  constructor(props: {}) {
    super(props);

    // init state
    this.state = {
      // appearance
      showSpinner: wikiStore.table.showSpinner,

      // table data
      filename: null,       // if null, show "Table Viewer"

      errorMessage: {} as ErrorMessage,
    };
  }

  private disposers: IReactionDisposer[] = [];

  componentDidMount() {
    this.disposers.push(reaction(() => wikiStore.table.qnodes, () => this.updateQnodeCellsFromStore()));
    this.disposers.push(reaction(() => wikiStore.table.rowData, () => this.updateQnodeCellsFromStore()));
    this.disposers.push(reaction(() => wikiStore.table.tableData, (tableData: any) => this.updateTableData(tableData)));

    this.disposers.push(reaction(() => wikiStore.table.styledColName, () => this.updateStyleByCellFromStore()));
    this.disposers.push(reaction(() => wikiStore.table.styledRowName, () => this.updateStyleByCellFromStore()));
    this.disposers.push(reaction(() => wikiStore.table.styleCell, () => this.updateStyleByCellFromStore()));
    this.disposers.push(reaction(() => wikiStore.table.styledOverride, () => this.updateStyleByCellFromStore()));
  }

  componentWillUnmount() {
    for(const disposer of this.disposers) {
      disposer();
    }
  }

  async handleOpenTableFile(event:any) {
    console.log('handleOpenTableFile called');
  }

  updateQnodeCellsFromStore() {
    console.log('updateQnodeCellsFromStore called');
  }

  updateTableData(tableData?: TableData) {
    console.log('updateTableData called');
  }

  updateStyleByCellFromStore() {
    console.log('updateStyleByCellFromStore called');
  }

  render() {

    const { filename, isCSV, columnDefs, rowData } = this.state;

    // render title
    let titleHtml;
    if (!filename) {
      titleHtml = <span>Table&nbsp;Viewer</span>;
    } else {
      titleHtml = <span>{filename}<span style={{ color: "hsl(150, 50%, 70%)" }}>&nbsp;[Read-Only]</span></span>;
    }

    // render upload tooltip
    const uploadToolTipHtml = (
      <Tooltip style={{ width: "fit-content" }} id="upload">
        <div className="text-left small">
          <b>Accepted file types:</b><br />
          • Comma-Separated Values (.csv)<br />
          • Microsoft Excel (.xls/.xlsx)
        </div>
      </Tooltip>
    );

    return (
      <div className="w-100 h-100 p-1">

        {this.state.errorMessage.errorDescription ? <ToastMessage message={this.state.errorMessage}/> : null }

        <Card className="w-100 h-100 shadow-sm">

          {/* header */}
          <Card.Header style={{ height: "40px", padding: "0.5rem 1rem", background: "#339966" }}>

            {/* title */}
            <div
              className="text-white font-weight-bold d-inline-block text-truncate"
              style={{ width: "calc(100% - 305px)", cursor: "default" }}>
              {titleHtml}
            </div>

            {/* button to upload table file */}
            <OverlayTrigger overlay={uploadToolTipHtml} placement="bottom" trigger={["hover", "focus"]}>
              <Button
                className="d-inline-block float-right"
                variant="outline-light"
                size="sm"
                style={{ padding: "0rem 0.5rem" }}
                onClick={() => { document.getElementById("file_table")?.click(); }}
              >
                Upload data file
              </Button>
            </OverlayTrigger>

            {/* hidden input of table file */}
            <input
              type="file"
              id="file_table"
              accept=".csv, .xls, .xlsx"
              style={{ display: "none" }}
              onChange={this.handleOpenTableFile.bind(this)}
              onClick={(event) => { (event.target as HTMLInputElement).value = '' }}
            />
          </Card.Header>

          <Card.Body className="ag-theme-balham w-100 h-100 p-0" style={{ overflow: "hidden" }}>

            {/* loading spinner */}
            <div className="mySpinner" hidden={!wikiStore.table.showSpinner}>
              <Spinner animation="border" />
            </div>
          </Card.Body>

          <Card.Footer>
          </Card.Footer>
        </Card>
      </div>
    )
  }
}

export default TableComponent
