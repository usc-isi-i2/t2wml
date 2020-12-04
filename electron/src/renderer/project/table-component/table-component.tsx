import React, { ChangeEvent, Component } from 'react';

import './table-component.css';

import { QNode, TableDTO } from '../../common/dtos';
import { Button, Card, OverlayTrigger, Spinner, Tooltip } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheckSquare } from '@fortawesome/free-solid-svg-icons';
import { faSquare } from '@fortawesome/free-solid-svg-icons';

import { LOG, ErrorMessage, Cell, CellSelection } from '../../common/general';
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
import { LayersDTO } from '../../common/dtos';



interface TableState {
  showSpinner: boolean;
  showToast: boolean;

  // table data
  filename: string | null,       // if null, show "Table Viewer"
  multipleSheets: boolean,
  sheetNames: Array<string> | null,
  currSheetName: string | null,

  tableData: any;// TODO- add the type

  selectedCell: Cell | null;
  selectedQualifiers: Array<Cell> | null,
  selectedMainSubject: Cell | null,
  selectedProperty: Cell | null,

  annotationMode: boolean,
  showCleanedData: boolean,
  showAnnotationMenu: boolean,
  annotationMenuPosition: Array<number> | null,

  errorMessage: ErrorMessage;
}

const MIN_NUM_ROWS = 100; // how many rows do we want?
const CHARACTERS = [...Array(26)].map((a, i) => String.fromCharCode(97+i).toUpperCase());

@observer
class TableComponent extends Component<{}, TableState> {
  private tableRef = React.createRef<HTMLTableElement>();
  private selecting = false;
  private selections: CellSelection[] = [];
  private prevElement: EventTarget | undefined = undefined;

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
      selectedProperty: new Cell(),

      annotationMode: false,
      showCleanedData: false,
      showAnnotationMenu: false,
      annotationMenuPosition: [50, 70],

      errorMessage: {} as ErrorMessage,
    };
  }

  private disposers: IReactionDisposer[] = [];

  componentDidMount() {
    document.addEventListener('keydown', (event) => this.handleOnKeyDown(event));

    this.disposers.push(reaction(() => wikiStore.table.table, (table) => this.updateTableData(table)));
    this.disposers.push(reaction(() => wikiStore.layers.type, () => this.styleCellTypeColors()));
    this.disposers.push(reaction(() => wikiStore.table.showCleanedData, () => this.showCleanedData()));
  }

  componentWillUnmount() {
    document.removeEventListener('keydown', (event) => this.handleOnKeyDown(event));
    for ( const disposer of this.disposers ) {
      disposer();
    }
  }

  showCleanedData() {
    const { showCleanedData } = this.state;
    this.setState({showCleanedData: !showCleanedData});
  }

  async handleOpenTableFile(event: ChangeEvent) {
    this.resetTableData();

    // get table file
    const file = (event.target as HTMLInputElement).files![0];
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
    } catch(error) {
      error.errorDescription += "\n\nCannot open file!";
      this.setState({ errorMessage: error });
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
      selectedProperty: null,
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
        const stuff = tableData[index[0]][index[1]];
        tableData[index[0]][index[1]] = {...stuff, type};
      }
    }
    const qnodes = wikiStore.layers.qnode;
    for (const entry of qnodes.entries) {
      for (const index of entry.indices) {
        const stuff = tableData[index[0]][index[1]];
        tableData[index[0]][index[1]] = {...stuff, qnode: true};
      }
    }
    const cleaned = wikiStore.layers.cleaned;
    for (const entry of cleaned.entries) {
      const { cleaned, original } = entry;
      for (const index of entry.indices) {
        const stuff = tableData[index[0]][index[1]];
        tableData[index[0]][index[1]] = {...stuff, cleaned, original};
      }
    }
    this.setState({tableData});
  }

  async handleSelectSheet(event: React.MouseEvent) {
    this.resetTableData();

    // remove current status
    wikiStore.yaml.yamlContent = '';
    wikiStore.output.isDownloadDisabled = true;

    // before sending request
    wikiStore.table.showSpinner = true;
    wikiStore.wikifier.showSpinner = true;

    // send request
    const sheetName = (event.target as HTMLInputElement).innerHTML;
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
      error.errorDescription += "\n\nCannot change sheet!";
      this.setState({ errorMessage: error });
    }
    wikiStore.table.showSpinner = false;
    wikiStore.wikifier.showSpinner = false;
  }

  updateProjectInfo() {
    if ( wikiStore.projects.projectDTO ) {
      const project = wikiStore.projects.projectDTO;
      const filename = project._saved_state.current_data_file;
      const sheetNames = project.data_files[filename].val_arr;
      const currSheetName = project._saved_state.current_sheet;
      const multipleSheets = sheetNames && sheetNames.length > 1;
      this.setState({ filename, sheetNames, currSheetName, multipleSheets });
    }
  }

  updateTableData(table?: TableDTO) {
    if ( !table ) { return; }
    const tableData = [];
    for ( let i = 0; i < table.cells.length; i++ ) {
      const rowData = [];
      for ( let j = 0; j < table.cells[i].length; j++ ) {
        rowData.push({data: table.cells[i][j]});
      }
      tableData.push(rowData);
    }
    this.setState({tableData});
    this.updateProjectInfo();
  }

  resetSelections() {
    const table = this.tableRef.current;
    if (table) {
      table.querySelectorAll('.active').forEach(e => {
        e.classList.remove('active');
        e.classList.remove('property');
        e.classList.remove('qualifier');
        e.classList.remove('main-subject');
      });
      table.querySelectorAll('.cell-border-top').forEach(e => e.remove());
      table.querySelectorAll('.cell-border-left').forEach(e => e.remove());
      table.querySelectorAll('.cell-border-right').forEach(e => e.remove());
      table.querySelectorAll('.cell-border-bottom').forEach(e => e.remove());
    }
  }

  updateSelections() {
    const table = this.tableRef.current;
    if (!table) {
      return;
    }

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
            bottomRow
          );
          colIndex += 1;
        }
        rowIndex += 1;
      }
    });
  }

  selectCell(cell: Element, rowIndex: number, colIndex: number, topRow: number, leftCol: number, rightCol: number, bottomRow: number, className?: string) {
    // Activate the current cell
    cell.classList.add('active');
    if ( className ) {
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

  selectRelatedCells(row: number, col: number) {
    const selectedCell = new Cell(col-1, row-1);
    this.setState({selectedCell, showToast: true});

    // Update selected cell in the data store
    wikiStore.table.selectedCell = selectedCell;

    const statement = wikiStore.layers.statement.find(selectedCell);
    if ( !statement || !statement.cells ) { return; }

    // Get a reference to the table elements
    const table = this.tableRef.current;
    const rows = table!.querySelectorAll('tr');

    // Select qualifier cells
    if ( 'qualifiers' in statement.cells ) {
      statement.cells.qualifiers.forEach((cell: any) => {
        if ( cell.qualifier ) {
          const y = cell.qualifier[0];
          const x = cell.qualifier[1];
          const tableCell = rows[y+1].children[x+1];
          this.selectCell(tableCell, y, x, y, x, x, y, 'qualifier');
        }
      });
    }

    // Select the cell with the main-subject
    if ( 'subject' in statement.cells ) {
      const y = statement.cells.subject[0];
      const x = statement.cells.subject[1];
      const cell = rows[y+1].children[x+1];
      this.selectCell(cell, y, x, y, x, x, y, 'main-subject');
    }

    // Select the cell with the property
    if ( 'property' in statement.cells ) {
      const y = statement.cells.property[0];
      const x = statement.cells.property[1];
      const cell = rows[y+1].children[x+1];
      this.selectCell(cell, y, x, y, x, x, y, 'property');
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

  handleOnKeyDown(event: KeyboardEvent) {
    if ( event.keyCode == 27 ) {
      this.resetTableData();
    }
  }

  handleOnMouseUp(event: React.MouseEvent) {
    this.selecting = false;
    if ( this.selections ) {
      this.checkSelectionOverlaps();
      this.openAnnotationMenu(event);
    }
  }

  handleOnMouseDown(event: React.MouseEvent) {
    const element = event.target as any;

    if ( element.nodeName !== 'TD' ) { return; }

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

  handleOnMouseMove(event: React.MouseEvent) {
    const element = event.target as any;
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

  getClassName(stuff: LayersDTO, row: number, col: number) {
    const {
      selectedCell,
      selectedProperty,
      selectedQualifiers,
      selectedMainSubject,
    } = this.state;
    let className = stuff['type'] ? `type-${stuff['type']}` : '';
    if ( stuff.cleaned ) {
        className += ' type-cleaned';
    }
    if ( stuff.qnode ) {
        className += ' type-qnode';
    }
    if ( selectedCell ) {
      if ( selectedCell.row === row && selectedCell.col === col ) {
        className += ' active';
      }
    }
    if ( selectedMainSubject ) {
      if ( selectedMainSubject.row === row &&
        selectedMainSubject.col === col ) {
        className += ' active-main-subject';
      }
    }
    if ( selectedProperty ) {
      if ( selectedProperty.row === row &&
        selectedProperty.col === col ) {
        className += ' active-property';
      }
    }
    if ( selectedQualifiers ) {
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
        {filename ? (
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
    const { multipleSheets } = this.state;
    return (
      <TableLegend offset={multipleSheets} />
    )
  }

  openAnnotationMenu(event: React.MouseEvent) {
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
    const { annotationMode, selectedCell, showToast } = this.state;
    if ( showToast && !annotationMode ) {
      let text = 'Selected:';
      if ( this.selections ) {
        this.selections.forEach(selection => {
          text += ` ${utils.humanReadableSelection(selection)}`;
        });
      }
      const qnode = wikiStore.layers.qnode.find(selectedCell);
      return (
        <TableToast
          text={text}
          qnode={qnode as QNode}
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
              {CHARACTERS.map(c => <th key={c}><div>{c}</div></th>)}
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
    const { showCleanedData, tableData } = this.state;
    if ( tableData ) {
      const rows = [...Array(Math.max(tableData.length, MIN_NUM_ROWS))];
      const cols = [...Array(Math.max(tableData[0].length, 26))];
      return (
        <div className="table-wrapper">
          <table ref={this.tableRef}
            onMouseUp={this.handleOnMouseUp.bind(this)}
            onMouseDown={this.handleOnMouseDown.bind(this)}
            onMouseMove={this.handleOnMouseMove.bind(this)}>
            <thead>
              <tr>
                <th></th>
                {cols.map((r, i) => (
                  <th key={i}>
                    <div>{utils.columnToLetter(i + 1)}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((e, i) => (
                <tr key={`row-${i}`}>
                  <td>{i+1}</td>
                  {cols.map((r, j) => {
                    if ( i < tableData.length && j < tableData[i].length ) {
                      const stuff = tableData[i][j];
                      const { data, cleaned } = stuff;
                      return (
                        <td key={`cell-${j}`}
                          className={this.getClassName(stuff, i, j)}>
                          { showCleanedData && !!cleaned ? cleaned : data }
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
        disabled={wikiStore.yaml.showSpinner}
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
