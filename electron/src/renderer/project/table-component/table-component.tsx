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
      filename: null,       // if null, show "Table Viewer"
      rowData: null,

      errorMessage: {} as ErrorMessage,
    };

    this.tableRef = React.createRef();
    this.selecting = false;
    this.selections = [];
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
    this.selecting = false;
    if ( !event.metaKey ) {
      this.selections = [];
      this.resetSelections();
    }
  }

  handleOnMouseDown(event) {
    const element = event.target;

    // Make sure users can only select table cells
    if ( element.nodeName === 'TD' ) {

      // Make sure users are not able to select the cells in the index column
      if ( element.parentElement.firstChild !== event.target ) {

        // Activate the selection mode
        this.selecting = true;

        // Set both coordinates to the same cell
        const x1 = element.cellIndex;
        const x2 = element.cellIndex;
        const y1 = element.parentElement.rowIndex;
        const y2 = element.parentElement.rowIndex;

        // Update selection coordinates
        if ( !event.metaKey ) {
          this.selections = [{x1, x2, y1, y2}];
        } else {
          this.selections.push({x1, x2, y1, y2});
        }

        // Activate the element on click
        element.classList.add('active');
      }
    }
  }

  handleOnMouseMove(event) {
    const element = event.target;

    if ( this.selecting && element.nodeName === 'TD' ) {

      // Make sure users are not able to select the cells in the index column
      if ( element.parentElement.firstChild !== event.target ) {

        // Update the last x coordinate of the selection
        const x2 = element.cellIndex;
        this.selections[this.selections.length-1]['x2'] = x2;

        // Update the last y coordinate of the selection
        const y2 = element.parentElement.rowIndex;
        this.selections[this.selections.length-1]['y2'] = y2;

        // Update selections
        this.updateSelections();
      }
    }
  }

  resetSelections() {
    const table = this.tableRef.current;
    table.querySelectorAll('.active').forEach(e => e.className = '');
    table.querySelectorAll('.cell-border-top').forEach(e => e.remove());
    table.querySelectorAll('.cell-border-left').forEach(e => e.remove());
    table.querySelectorAll('.cell-border-right').forEach(e => e.remove());
    table.querySelectorAll('.cell-border-bottom').forEach(e => e.remove());
  }

  updateSelections() {
    const table = this.tableRef.current;

    // Reset selections before update
    this.resetSelections();

    const rows = table.querySelectorAll('tr');
    this.selections.forEach(selection => {
      const {x1, x2, y1, y2} = selection;
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

          // Add a top border to the cells at the top of the selection
          if ( rowIndex === topRow ) {
            const borderTop = document.createElement('div');
            borderTop.classList.add('cell-border-top');
            cell.appendChild(borderTop);
          }

          // Add a left border to the cells on the left of the selection
          if ( colIndex === leftCol ) {
            const borderLeft = document.createElement('div');
            borderLeft.classList.add('cell-border-left');
            cell.appendChild(borderLeft);
          }

          // Add a right border to the cells on the right of the selection
          if ( colIndex === rightCol ) {
            const borderRight = document.createElement('div');
            borderRight.classList.add('cell-border-right');
            cell.appendChild(borderRight);
          }

          // Add a bottom border to the cells at the bottom of the selection
          if ( rowIndex === bottomRow ) {
            const borderBottom = document.createElement('div');
            borderBottom.classList.add('cell-border-bottom');
            cell.appendChild(borderBottom);
          }

          colIndex += 1;
        }
        rowIndex += 1;
      }
    });
  }

  renderPlaceholder() {
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
