import React, { Component } from 'react';

import './table-component.css';
import { TableDTO } from '../../common/dtos';
import { Button, Card, OverlayTrigger, Spinner, Tooltip } from 'react-bootstrap';

import { LOG, WikifierData, ErrorMessage, Cell } from '../../common/general';
import RequestService from '../../common/service';
import SheetSelector from './sheet-selector';
import ToastMessage from '../../common/toast';

import { observer } from 'mobx-react';
import wikiStore from '../../data/store';
import { IReactionDisposer, reaction } from 'mobx';


interface Column {
  headerName: string;
  field: string;
  pinned?: string; // "left" | "right";
  width?: number;
}


interface TableState {
  showSpinner: boolean;

  // table data
  filename: string | null,       // if null, show "Table Viewer"
  multipleSheets: false,
  sheetNames: Array<string> | null,
  currSheetName: string | null,

  tableData: any; // Array<object>; // todo: add interface

  yamlRegions: any; // null,
  selectedCell: Cell | null;

  errorMessage: ErrorMessage;
}

const MIN_NUM_ROWS = 100; // how many rows do we want?
const CHARACTERS = [...Array(26)].map((a, i) => String.fromCharCode(97+i).toUpperCase());

@observer
class TableComponent extends Component<{}, TableState> {

  private requestService: RequestService;

  constructor(props: {}) {
    super(props);

    this.requestService = new RequestService();

    // init state
    this.state = {
      // appearance
      showSpinner: wikiStore.table.showSpinner,

      // table data
      filename: null,
      tableData: null,
      sheetNames: null,
      currSheetName: null,
      multipleSheets: false,

      errorMessage: {} as ErrorMessage,
    };

    this.tableRef = React.createRef();
    this.selecting = false;
    this.selections = [];
  }

  private disposers: IReactionDisposer[] = [];

  componentDidMount() {
    document.addEventListener('keydown', (event) => this.handleOnKeyDown(event));

    this.disposers.push(reaction(() => wikiStore.table.qnodes, () => this.updateQnodeCellsFromStore()));
    this.disposers.push(reaction(() => wikiStore.table.rowData, () => this.updateQnodeCellsFromStore()));

    this.disposers.push(reaction(() => wikiStore.table.table, (table) => this.updateTableData(table)));
    this.disposers.push(reaction(() => wikiStore.layers.type, () => this.styleCellTypeColors()));
  }

  componentWillUnmount() {
    document.removeEventListener('keydown', (event) => this.handleOnKeyDown(event));
    for ( const disposer of this.disposers ) {
      disposer();
    }
  }

  async handleOpenTableFile(event: any) {
    console.log('handleOpenTableFile called');
  }

  resetTableData() {
    this.setState({
      errorMessage: {} as ErrorMessage,
    });
  }

  styleCellTypeColors() {
    const { tableData } = this.state;
    const types = wikiStore.layers.type;
    for (const entry of types.entries) {
      const type = entry.type;
      for (const index of entry.indices) {
        let item = tableData[index[0]][index[1]];
        tableData[index[0]][index[1]] = {...item, type};
      }
    }
    this.setState({tableData});
  }

  async handleSelectSheet(event: any) {
    this.resetTableData();

    // remove current status
    wikiStore.yaml.yamlContent = undefined;
    wikiStore.output.isDownloadDisabled = true;

    // before sending request
    wikiStore.table.showSpinner = true;
    wikiStore.wikifier.showSpinner = true;

    // send request
    const sheetName = event.target.innerHTML;
    console.log("<TableViewer> -> %c/change_sheet%c for sheet: %c" + sheetName, LOG.link, LOG.default, LOG.highlight);
    try {
      await this.requestService.changeSheet(wikiStore.projects.current!.folder, sheetName);
      console.log("<TableViewer> <- %c/change_sheet%c with:", LOG.link, LOG.default);

      if (wikiStore.yaml.yamlContent) {
        wikiStore.table.isCellSelectable = true;
        wikiStore.output.isDownloadDisabled = false;
      } else {
        wikiStore.table.isCellSelectable = false;
      }

    } catch (error) {
      console.log(error);
      error.errorDescription += "\n\nCannot change sheet!";
      this.setState({ errorMessage: error });
    }
    wikiStore.table.showSpinner = false;
    wikiStore.wikifier.showSpinner = false;
  }

  updateQnodeCellsFromStore() {
    console.log('updateQnodeCellsFromStore called');
  }

  updateProjectInfo() {
    if ( wikiStore.projects.projectDTO ) {
      const project = wikiStore.projects.projectDTO;
      const filename = project._saved_state.current_data_file;
      const sheetNames = project.data_files[filename];
      const currSheetName = project._saved_state.current_sheet;
      const multipleSheets = sheetNames && sheetNames.length > 1;
      this.setState({ filename, sheetNames, currSheetName, multipleSheets });
    }
  }

  updateTableData(table?: TableDTO) {
    if ( !table ) { return; }
    let tableData = [];
    for ( const [rowIndex, row] of table.cells.entries() ) {
      let rowData = [];
      for ( const [colIndex, cellContent] of row.entries() ) {
        rowData.push({data: cellContent});
      }
      tableData.push(rowData);
    }
    this.setState({tableData});
    this.updateProjectInfo();
  }

  resetSelections() {
    const table = this.tableRef.current;
    table.querySelectorAll('.active').forEach(e => e.classList.remove('active'));
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
          this.selectCell(
            rows[rowIndex].children[colIndex],
            rowIndex,
            colIndex,
            topRow,
            leftCol,
            rightCol,
            bottomRow,
          );
          colIndex += 1;
        }
        rowIndex += 1;
      }
    });
  }

  selectCell(cell, rowIndex, colIndex, topRow, leftCol, rightCol, bottomRow) {
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
  }

  handleOnKeyDown(event) {
    if ( event.keyCode == 27 ) {
      this.selecting = false;
      this.resetSelections();
    }
  }

  handleOnMouseUp(event) {
    this.selecting = false;
  }

  handleOnMouseDown(event) {
    const element = event.target;

    // Make sure users can only select table cells
    if ( element.nodeName === 'TD' ) {

      // Activate the selection mode
      this.selecting = true;

      // Set both coordinates to the same cell
      const x1 = element.cellIndex;
      const x2 = element.cellIndex;
      const y1 = element.parentElement.rowIndex;
      const y2 = element.parentElement.rowIndex;

      // Update selection coordinates
      if ( !event.metaKey ) {

        // Extend the previous selection if user is holding down Shift key
        if ( event.shiftKey && !!this.selections.length ) {
          const prevSelection = this.selections[this.selections.length-1];

          // Extend the previous selection left or right
          if ( x1 !== prevSelection['x1'] ) {
            if ( x1 < prevSelection['x1'] ) {
              prevSelection['x1'] = x1;
            } else {
              prevSelection['x2'] = x1;
            }
          }

          // Extend the previous selection up or down
          if ( y1 !== prevSelection['y1'] ) {
            if ( y1 < prevSelection['y1'] ) {
              prevSelection['y1'] = y1;
            } else {
              prevSelection['y2'] = y1;
            }
          }

          this.updateSelections();
        } else {
          this.resetSelections()
          this.selections = [{x1, x2, y1, y2}];

          // Activate the element on click
          this.selectCell(element, y1, x1, y1, x1, x1, y1);
        }
      } else {

        // Add a new selection separately
        this.selections.push({x1, x2, y1, y2});

        // Activate the element on click
        this.selectCell(element, y1, x1, y1, x1, x1, y1);
      }
    }
  }

  handleOnMouseMove(event) {
    const element = event.target;

    if ( this.selecting && !event.shiftKey ) {

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
    } else {
      this.selecting = false;
    }
  }

  renderErrorMessage() {
    const { errorMessage } = this.state;
    if ( errorMessage.errorDescription ) {
      return (
        <ToastMessage message={this.state.errorMessage} />
      )
    }
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
    const { tableData } = this.state;
    if ( !!tableData ) {
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
            {[...Array(Math.max(tableData.length, MIN_NUM_ROWS))].map((e, i) => (
              <tr key={`row-${i}`}>
                <td>{i+1}</td>
                {CHARACTERS.map((c, j) => {
                  if ( i < tableData.length && j < tableData[i].length ) {
                    const item = tableData[i][j]
                    return (
                      <td key={`cell-${j}`}
                        className={!!item['type'] ? `type-${item['type']}` : ''}>
                        {item['data']}
                      </td>
                    )
                  } else {
                    return <td key={`cell-${j}`} />
                  }
                })}
              </tr>
            ))}
          </tbody>
        </table>
      )
    } else {
      return this.renderPlaceholder();
    }
  }

  renderTitle() {
    const { filename } = this.state;
    return (
      <div style={{ width: "calc(100% - 250px)", cursor: "default" }}
        className="text-white font-weight-bold d-inline-block text-truncate">
        {!!filename ? (
          <span>
            {filename}
            <span style={{ opacity: "0.5", paddingLeft: "5px" }}>
              [Read-Only]
            </span>
          </span>
        ) : (
          <span>Table&nbsp;Viewer</span>
        )}
      </div>
    )
  }

  renderUploadTooltip() {
    return (
      <Tooltip style={{ width: "fit-content" }} id="upload">
        <div className="text-left small">
          <b>Accepted file types:</b><br />
          • Comma-Separated Values (.csv)<br />
          • Microsoft Excel (.xls/.xlsx)
        </div>
      </Tooltip>
    )
  }

  renderUploadButton() {
    return (
      <React.Fragment>
        <OverlayTrigger
          placement="bottom"
          trigger={["hover", "focus"]}
          overlay={this.renderUploadTooltip()}>
          <Button size="sm"
            className="d-inline-block float-right py-0 px-2"
            variant="outline-light"
            onClick={() => document.getElementById("file_table")?.click()}>
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
          onClick={(event) => (event.target as HTMLInputElement).value = ''}
        />
      </React.Fragment>
    )
  }

  renderLoading() {
    return (
      <div className="mySpinner" hidden={!wikiStore.table.showSpinner}>
        <Spinner animation="border" />
      </div>
    )
  }

  render() {
    const { currSheetName, multipleSheets, sheetNames } = this.state;

    return (
      <div className="w-100 h-100 p-1">

        {this.renderErrorMessage()}

        <Card className="w-100 h-100 shadow-sm">

          <Card.Header className={"py-2 px-3"}
            style={{ height: "40px", background: "#339966" }}>
            {this.renderTitle()}
            {this.renderUploadButton()}
          </Card.Header>

          <Card.Body className="ag-theme-balham w-100 h-100 p-0 table-wrapper">
            {this.renderLoading()}
            {this.renderTable()}
          </Card.Body>

          <Card.Footer hidden={!multipleSheets} className={'p-0'}>
            <SheetSelector
              sheetNames={sheetNames}
              currSheetName={currSheetName}
              handleSelectSheet={(event) => this.handleSelectSheet(event)} />
          </Card.Footer>
        </Card>
      </div>
    )
  }
}

export default TableComponent
