import React, { Component } from 'react';

import './table-component.css';
import { TableDTO } from '../../common/dtos';
import { Button, Card, OverlayTrigger, Spinner, Tooltip } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheckSquare } from '@fortawesome/free-solid-svg-icons';
import { faSquare } from '@fortawesome/free-solid-svg-icons';

import { LOG, WikifierData, ErrorMessage, Cell } from '../../common/general';
import RequestService from '../../common/service';
import SheetSelector from './sheet-selector';
import ToastMessage from '../../common/toast';
import TableLegend from './table-legend';
import AnnotationMenu from './annotation-menu';
import TableToast from './table-toast';

import * as utils from './table-utils';

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
  showToast: boolean;

  // table data
  filename: string | null,       // if null, show "Table Viewer"
  multipleSheets: false,
  sheetNames: Array<string> | null,
  currSheetName: string | null,

  tableData: any; // Array<object>;

  yamlRegions: any; // null,

  selectedCell: Cell | null;
  selectedQualifiers: Array<Cell> | null,
  selectedMainSubject: Cell | null,

  annotationMode: boolean,
  showAnnotationMenu: boolean,
  annotationMenuPosition: Array<int> | null,

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
      showToast: false,

      // table data
      filename: null,
      tableData: null,
      sheetNames: null,
      currSheetName: null,
      multipleSheets: false,

      selectedCell: new Cell(),
      selectedQualifiers: [],
      selectedMainSubject: new Cell(),

      annotationMode: false,
      showAnnotationMenu: false,
      annotationMenuPosition: [50, 70],

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
    this.resetTableData();

    // get table file
    const file = event.target.files[0];
    if ( !file ) { return; }

    // before sending request
    wikiStore.table.showSpinner = true;
    wikiStore.wikifier.showSpinner = true;

    // send request
    console.log("<TableComponent> -> %c/upload_data_file%c for table file: %c" + file.name, LOG.link, LOG.default, LOG.highlight);
    const formData = new FormData();
    formData.append("file", file);
    try {
      await this.requestService.call(this, () => this.requestService.uploadDataFile(wikiStore.projects.current!.folder, formData));
      console.log("<TableComponent> <- %c/upload_data_file%c with:", LOG.link, LOG.default);

      // load yaml data
      if ( wikiStore.yaml.yamlContent ) {
        wikiStore.table.isCellSelectable = true;
      } else {
        wikiStore.table.isCellSelectable = false;
      }
    } catch(err) {
      console.log('err in file upload: ', err);
    } finally {
      wikiStore.table.showSpinner = false;
      wikiStore.wikifier.showSpinner = false;
    }
  }

  resetTableData() {
    this.selecting = false;
    this.selections = [];
    this.resetSelections();
    this.setState({
      errorMessage: {} as ErrorMessage,
      showToast: false,
      selectedCell: null,
      selectedQualifiers: null,
      selectedMainSubject: null,
      showAnnotationMenu: false,
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
    const qnodes = wikiStore.layers.qnode;
    for (const entry of qnodes.entries) {
      for (const index of entry.indices) {
        let item = tableData[index[0]][index[1]];
        tableData[index[0]][index[1]] = {...item, qnode: true};
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
    console.log("<TableComponent> -> %c/change_sheet%c for sheet: %c" + sheetName, LOG.link, LOG.default, LOG.highlight);
    try {
      await this.requestService.changeSheet(wikiStore.projects.current!.folder, sheetName);
      console.log("<TableComponent> <- %c/change_sheet%c with:", LOG.link, LOG.default);

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
    table.querySelectorAll('.active').forEach(e => {
      e.classList.remove('active');
      e.classList.remove('qualifier');
      e.classList.remove('main-subject');
    });
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

  selectCell(cell, rowIndex, colIndex, topRow, leftCol, rightCol, bottomRow, className) {
    // Activate the current cell
    cell.classList.add('active');
    if ( !!className ) {
      cell.classList.add(className);
    }

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

  selectRelatedCells(row, col) {
    const selectedCell = new Cell(col-1, row-1);
    this.setState({selectedCell, showToast: true});

    // Update selected cell in the data store
    wikiStore.table.selectedCell = selectedCell;

    const statement = wikiStore.layers.statement.find(selectedCell);
    if ( !statement ) { return; }

    // Get a reference to the table elements
    const table = this.tableRef.current;
    const rows = table.querySelectorAll('tr');

    // Select qualifier cells
    const qualifier = statement.qualifier;
    if ( !!statement.qualifier ) {
      statement.qualifier.forEach(qualifier => {
        const y = qualifier.cell[0];
        const x = qualifier.cell[1];
        const cell = rows[y+1].children[x+1];
        this.selectCell(cell, y, x, y, x, x, y, 'qualifier');
      });
    }

    // Select the cell with the main-subject
    if ( !!statement.cell ) {
      const y = statement.cell[0];
      const x = statement.cell[1];
      const cell = rows[y+1].children[x+1];
      this.selectCell(cell, y, x, y, x, x, y, 'main-subject');
    }
  }

  checkSelectionOverlaps() {
    this.selections.map((selection, i) => {
      const { x1, y1, x2, y2 } = selection;

      // Get the coordinates of the sides
      const aTop = y1 <= y2 ? y1 : y2;
      const aLeft = x1 <= x2 ? x1 : x2;
      const aRight = x2 >= x1 ? x2 : x1;
      const aBottom = y2 >= y1 ? y2 : y1;

      for ( let j = 0; j < this.selections.length; j++ ) {
        if ( j !== i ) {
          const area = this.selections[j];

          // Get the coordinates of the sides
          const bTop = area.y1 <= area.y2 ? area.y1 : area.y2;
          const bLeft = area.x1 <= area.x2 ? area.x1 : area.x2;
          const bRight = area.x2 >= area.x1 ? area.x2 : area.x1;
          const bBottom = area.y2 >= area.y1 ? area.y2 : area.y1;

          // check for no-collisions between area A and B
          if ( aTop > bBottom ) {
            continue;
          }
          if ( aBottom < bTop ) {
            continue;
          }
          if ( aLeft > bRight ) {
            continue;
          }
          if ( aRight < bLeft ) {
            continue;
          }

          if ( bTop <= aTop &&
               bLeft <= aLeft &&
               bRight >= aRight &&
               bBottom >= aBottom ) {
            this.selections.splice(i, 1);
          } else {
            this.selections.splice(j, 1);
          }
          this.updateSelections();
          break;
        }
      }
    });
  }

  handleOnKeyDown(event) {
    if ( event.keyCode == 27 ) {
      this.resetTableData();
    }
  }

  handleOnMouseUp(event) {
    this.selecting = false;
    if ( !!this.selections ) {
      this.checkSelectionOverlaps();
      this.openAnnotationMenu(event);
    }
  }

  handleOnMouseDown(event) {
    const element = event.target;

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
        this.selectRelatedCells(y1, x1);
      }
    } else {

      // Add a new selection separately
      this.selections.push({x1, x2, y1, y2});

      // Activate the element on click
      this.selectCell(element, y1, x1, y1, x1, x1, y1);
    }

    // Initialize the previous element with the one selected
    this.prevElement = element;
  }

  handleOnMouseMove(event) {
    const element = event.target;
    if ( element === this.prevElement ) { return; }

    if ( this.selecting && !event.shiftKey ) {

      // Show the updated selection while moving
      this.setState({showToast: element.nodeName === 'TD'});

      // Update the last x coordinate of the selection
      const x2 = element.cellIndex;
      this.selections[this.selections.length-1]['x2'] = x2;

      // Update the last y coordinate of the selection
      const y2 = element.parentElement.rowIndex;
      this.selections[this.selections.length-1]['y2'] = y2;

      // Update selections
      this.updateSelections();

      // Update reference to the previous element
      this.prevElement = element;
    }
  }

  getClassName(item, row, col) {
    const {
      selectedCell,
      selectedQualifiers,
      selectedMainSubject,
    } = this.state;
    let className = !!item['type'] ? `type-${item['type']}` : '';
    if ( !!item.qnode ) {
        className += ' type-qnode';
    }
    if ( !!selectedCell ) {
      if ( selectedCell.row === row && selectedCell.col === col ) {
        className += ' active';
      }
    }
    if ( !!selectedMainSubject ) {
      if ( selectedMainSubject.row === row &&
        selectedMainSubject.col === col ) {
        className += ' active-main-subject';
      }
    }
    if ( !!selectedQualifiers ) {
      selectedQualifiers.forEach(selectedQualifier => {
        if ( selectedQualifier.row === row &&
          selectedQualifier.col === col ) {
          className += ' active-qualifier';
        }
      })
    }
    return className;
  }

  onCloseToast() {
    this.setState({showToast: false});
  }

  toggleAnnotationMode() {
    const { annotationMode } = this.state;
    this.setState({annotationMode: !annotationMode});
  }

  renderErrorMessage() {
    const { errorMessage } = this.state;
    if ( errorMessage.errorDescription ) {
      return (
        <ToastMessage message={this.state.errorMessage} />
      )
    }
  }

  renderTitle() {
    const { filename } = this.state;
    return (
      <div style={{ width: "calc(100% - 350px)", cursor: "default" }}
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

  renderAnnotationToggle() {
    const { annotationMode } = this.state;
    return (
      <div className="annotation-mode-toggle"
        onClick={() => this.toggleAnnotationMode()}>
        {annotationMode ? (
          <FontAwesomeIcon icon={faCheckSquare} />
        ) : (
          <FontAwesomeIcon icon={faSquare} />
        )}
        <p>Annotation Mode</p>
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

  renderLegend() {
    return <TableLegend />
  }

  openAnnotationMenu(event) {
    let { pageX, pageY } = event;
    pageX = pageX < 50 ? 50 : pageX;
    pageY = pageY - 50;
    this.setState({
      showAnnotationMenu: true,
      annotationMenuPosition: [pageX, pageY],
    });
  }

  closeAnnotationMenu() {
    this.setState({
      showAnnotationMenu: false,
    });
  }

  renderAnnotationMenu() {
    const { annotationMode, showAnnotationMenu, annotationMenuPosition } = this.state;
    if ( annotationMode && showAnnotationMenu ) {
      return (
        <AnnotationMenu
          selections={this.selections}
          position={annotationMenuPosition}
          onClose={() => this.closeAnnotationMenu()} />
      )
    }
  }

  renderToast() {
    const { selectedCell, showToast } = this.state;
    if ( showToast ) {
      let message = 'Selected:';
      if ( !!this.selections ) {
        this.selections.forEach(selection => {
          message += ` ${utils.humanReadableSelection(selection)}`
        });
      }
      return (
        <TableToast
          message={message}
          onClose={() => this.onCloseToast()}
        />
      )
    }
  }

  renderEmptyTable() {
    return (
      <div className="table-wrapper">
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
      </div>
    )
  }

  renderTable() {
    const { tableData } = this.state;
    if ( !!tableData ) {
      const rows = [...Array(Math.max(tableData.length, MIN_NUM_ROWS))]
      return (
        <div className="table-wrapper">
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
              {rows.map((e, i) => (
                <tr key={`row-${i}`}>
                  <td>{i+1}</td>
                  {CHARACTERS.map((c, j) => {
                    if ( i < tableData.length && j < tableData[i].length ) {
                      const item = tableData[i][j]
                      return (
                        <td key={`cell-${j}`}
                          className={this.getClassName(item, i, j)}>
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
        </div>
      )
    } else {
      return this.renderEmptyTable();
    }
  }

  renderSheetSelector() {
    const { currSheetName, sheetNames } = this.state;
    return (
      <SheetSelector
        sheetNames={sheetNames}
        currSheetName={currSheetName}
        handleSelectSheet={(event) => this.handleSelectSheet(event)} />
    )
  }

  render() {
    const { multipleSheets } = this.state;

    return (
      <div className="w-100 h-100 p-1">

        {this.renderErrorMessage()}

        <Card className="w-100 h-100 shadow-sm">

          <Card.Header className={"py-2 px-3"}
            style={{ height: "40px", background: "#339966" }}>
            {this.renderTitle()}
            {this.renderUploadButton()}
            {this.renderAnnotationToggle()}
          </Card.Header>

          <Card.Body className="ag-theme-balham w-100 h-100 p-0">
            {this.renderLoading()}
            {this.renderLegend()}
            {this.renderToast()}
            {this.renderTable()}
            {this.renderAnnotationMenu()}
          </Card.Body>

          <Card.Footer hidden={!multipleSheets} className={'p-0'}>
            {this.renderSheetSelector()}
          </Card.Footer>

        </Card>
      </div>
    )
  }
}

export default TableComponent
