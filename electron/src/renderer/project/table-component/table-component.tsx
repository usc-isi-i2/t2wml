import React, { Component } from 'react';

import './table-component.css';
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

const MIN_NUM_ROWS = 100; // how many rows do we want?
const CHARACTERS = [...Array(26)].map((a, i) => String.fromCharCode(97+i).toUpperCase());

@observer
class TableComponent extends Component<{}, TableState> {

  constructor(props: {}) {
    super(props);

    // init state
    this.state = {
      // appearance
      showSpinner: wikiStore.table.showSpinner,

      // table data
      selecting: false,
      filename: null,       // if null, show "Table Viewer"
      rowData: null,

      errorMessage: {} as ErrorMessage,
    };

    this.tableRef = React.createRef();
    this.selection = {};
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
    this.setState({
      rowData: tableData?.sheetData?.rowData,
    })
  }

  updateStyleByCellFromStore() {
    console.log('updateStyleByCellFromStore called');
  }

  handleOnMouseUp(event) {
    this.setState({selecting: false});
  }

  handleOnMouseDown(event) {
    const element = event.target;

    // Make sure users can only select table cells
    if ( element.nodeName === 'TD' ) {

      // Make sure users are not able to select the cells in the index column
      if ( element.parentElement.firstChild !== event.target ) {

        // Set both coordinates to the same cell
        const x1 = element.cellIndex;
        const x2 = element.cellIndex;
        const y1 = element.parentElement.rowIndex;
        const y2 = element.parentElement.rowIndex;
        this.selection = {x1, x2, y1, y2};

        // Update selection coordinates
        this.setState({
          selecting: true,
        });

        // Activate the element on click
        element.classList.add('active');
      }
    }
  }

  handleOnMouseMove(event) {
    const { selecting } = this.state;
    const element = event.target;

    if ( selecting && element.nodeName === 'TD' ) {

      // Make sure users are not able to select the cells in the index column
      if ( element.parentElement.firstChild !== event.target ) {

        // Update selection x coordinate
        const x2 = element.cellIndex;
        this.selection['x2'] = x2;

        // Update selection y coordinate
        const y2 = element.parentElement.rowIndex;
        this.selection['y2'] = y2;

        // Update selections
        this.updateSelection();
      }
    }
  }

  resetSelection() {
    const table = this.tableRef.current;
    table.querySelectorAll('.active').forEach(e => e.className = '');
  }

  updateSelection() {
    const table = this.tableRef.current;

    // Reset selections before update
    this.resetSelection();

    const rows = table.querySelectorAll('tr');
    const {x1, x2, y1, y2} = this.selection;
    const leftCol = Math.min(x1, x2);
    const rightCol = Math.max(x1, x2);
    const topRow = Math.min(y1, y2);
    const bottomRow = Math.max(y1, y2);
    let rowIndex = topRow;
    while ( rowIndex <= bottomRow ) {
      let colIndex = leftCol;
      while ( colIndex <= rightCol ) {
        const cell = rows[rowIndex].children[colIndex];

        // Activate the current cell
        cell.classList.add('active');

        colIndex += 1;
      }
      rowIndex += 1;
    }
  }

  renderPlaceholder() {
    const { selecting } = this.state;
    return (
      <table ref={this.tableRef}
        onMouseUp={this.handleOnMouseUp.bind(this)}
        onMouseDown={this.handleOnMouseDown.bind(this)}
        onMouseMove={this.handleOnMouseMove.bind(this)}>
        <thead>
          <tr>
            <th></th>
            {CHARACTERS.map(c => <th key={c}>{c}</th>)}
          </tr>
        </thead>
        <tbody>
          {[...Array(MIN_NUM_ROWS)].map((e, i) => (
            <tr key={`row-${i}`}>
              <td>{i+1}</td>
              {CHARACTERS.map((c, j) => (
                <td key={`cell-${j}`}></td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    )
  }

  renderTable() {
    const { rowData } = this.state;
    if ( !!rowData ) {
      return (
        <table ref={this.tableRef}
          onMouseUp={this.handleOnMouseUp.bind(this)}
          onMouseDown={this.handleOnMouseDown.bind(this)}
          onMouseMove={this.handleOnMouseMove.bind(this)}>
          <thead>
            <tr>
              <th></th>
              {CHARACTERS.map(c => <th key={c}>{c}</th>)}
            </tr>
          </thead>
          <tbody>
            {[...Array(Math.max(rowData.length, MIN_NUM_ROWS))].map((e, i) => (
              <tr key={`row-${i}`}>
                <td>{i+1}</td>
                {CHARACTERS.map((c, j) => (
                  <td key={`cell-${j}`}>
                    {i >= rowData.length ? '' : rowData[i][c]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )
    } else {
      return this.renderPlaceholder();
    }
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

            {/* table */}
            <div className="table-wrapper">
              {this.renderTable()}
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
