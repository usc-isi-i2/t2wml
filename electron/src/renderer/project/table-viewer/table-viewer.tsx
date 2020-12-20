import React, { Component } from 'react';

// App
import { Button, Card, OverlayTrigger, Spinner, Tooltip } from 'react-bootstrap';

// Table
import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/dist/styles/ag-grid.css';
import 'ag-grid-community/dist/styles/ag-theme-balham.css';
import { ChangeDetectionStrategyType } from 'ag-grid-react/lib/changeDetectionService';

// console.log
import { LOG, gridApiInterface, ErrorMessage, Cell, t2wmlColors } from '../../common/general';
import RequestService, { IStateWithError } from '../../common/service';
import ToastMessage from '../../common/toast';

import { observer } from "mobx-react";
import wikiStore from '../../data/store';
import TableLegend from './table-legend';
import SheetSelector from './sheet-selector';
import TableToast from './table-toast';
import { defaultColumns, defaultRows } from './table-definition';
import { IReactionDisposer, reaction } from 'mobx';
import { getColumns, getRowData } from './agGrid-Converter';
import * as utils from '../../common/utils'
import { CellIndex, CleanEntry } from '@/renderer/common/dtos';

interface Column {
  headerName: string;
  field: string;
  pinned?: string; // "left" | "right";
  width?: number;
}

interface TableState extends IStateWithError {
  showSpinner: boolean;
  showToast0: boolean;  // showing details of current cell
  showToast1: boolean;  // showing temperary messages
  msgInToast1: string,  // message shows in toast 1

  // table data
  filename: string | null,       // if null, show "Table Viewer"

  multipleSheets: boolean,
  sheetNames: Array<string> | null,     // if not multipleSheets, null
  currSheetName: string | null,  // if not multipleSheets, null

  columnDefs: Array<Column>;
  rowData: any; // Array<object>; // todo: add interface
  selectedCell: Cell;

  //cache styled cells for quick wiping
  styledCellsQnode: Array<CellIndex>
  styledCellsType: Array<CellIndex>
  styledCellsClean: Array<CleanEntry>

  showTable: boolean;  // Hide the table - used temporarily during long updates, to circumvent an AgGrid bug
}

@observer
class TableViewer extends Component<{}, TableState> {
  public gridApi: any;
  public gridColumnApi: any;

  private requestService: RequestService;

  constructor(props: {}) {
    super(props);
    this.requestService = new RequestService();

    // init state
    this.state = {
      // appearance
      showSpinner: wikiStore.table.showSpinner,
      showToast0: false,  // showing details of current cell
      showToast1: false,  // showing temperary messages
      msgInToast1: "Hi",  // message shows in toast 1

      // table data
      filename: null,       // if null, show "Table Viewer"
      multipleSheets: false,         // csv: true   excel: false
      sheetNames: null,     // csv: null    excel: [ "sheet1", "sheet2", ... ]
      currSheetName: null,  // csv: null    excel: "sheet1"
      columnDefs: defaultColumns,
      rowData: defaultRows,

      selectedCell: new Cell(),

      styledCellsQnode: new Array<CellIndex>(),
      styledCellsType: new Array<CellIndex>(),
      styledCellsClean: new Array<CleanEntry>(),

      errorMessage: {} as ErrorMessage,
      showTable: true,
    };

    // init functions
    this.handleOpenTableFile = this.handleOpenTableFile.bind(this);
    this.handleSelectCell = this.handleSelectCell.bind(this);
    this.handleSelectSheet = this.handleSelectSheet.bind(this);
  }

  private disposers: IReactionDisposer[] = [];

  componentDidMount() {
    //table names
    this.disposers.push(reaction(() => wikiStore.projects.current, () => this.updateTableData()));
    //fill table
    this.disposers.push(reaction(() => wikiStore.table.table, () => this.updateTableData()));
    this.disposers.push(reaction(() => wikiStore.table.showCleanedData, () => this.toggleDataView()));
    //select cell
    this.disposers.push(reaction(() => wikiStore.table.selectedCell, () => this.styleSelectedCell(wikiStore.table.selectedCell)));
    //css cells
    this.disposers.push(reaction(() => wikiStore.layers.type, () => this.styleCellTypeColors()));
    this.disposers.push(reaction(() => wikiStore.layers.cleaned, () => this.styleCleanedCells()));
    this.disposers.push(reaction(() => wikiStore.layers.qnode, () => this.styleQnodeCells()));

  }

  componentWillUnmount() {
    for (const disposer of this.disposers) {
      disposer();
    }
  }

  onGridReady(params: gridApiInterface) {
    // store the api
    this.gridApi = params.api;
    this.gridColumnApi = params.columnApi;
    // Need to call this here, for some reason the grid is initially displayed with no styles
    // and we need to apply them again once the grid is ready.
    if (this.state.rowData) {
      this.gridApi.setRowData(this.state.rowData);
    }
    // console.log("<TableViewer> inited ag-grid and retrieved its API");
  }

  async handleOpenTableFile(event: any) {

    // remove current status
    wikiStore.table.isCellSelectable = false;
    this.updateSelectedCell(new Cell());

    // get table file
    const file = event.target.files[0];
    if (!file) return;

    // before sending request
    wikiStore.table.showSpinner = true;
    wikiStore.wikifier.showSpinner = true;

    // send request
    console.log("<TableViewer> -> %c/upload_data_file%c for table file: %c" + file.name, LOG.link, LOG.default, LOG.highlight);
    const data = {"filepath": file.path};
    try {
      await this.requestService.call(this, () => this.requestService.uploadDataFile(wikiStore.projects.current!.folder, data));
      console.log("<TableViewer> <- %c/upload_data_file%c with:", LOG.link, LOG.default);

      // load yaml data
      if (wikiStore.yaml.yamlContent) {
        wikiStore.table.isCellSelectable = true;
      } else {
        wikiStore.table.isCellSelectable = false;
      }



    } catch(error) {
      console.log(error);
    } finally {
      wikiStore.table.showSpinner = false;
      wikiStore.wikifier.showSpinner = false;
    }
  }


  async handleSelectSheet(event: any) {
    const sheetName = event.target.innerHTML;
    this.setState({
      showTable: false
    });
    
    // save prev yaml
    await wikiStore.yaml.saveYaml();

    // remove current status
    this.updateSelectedCell(new Cell());
    wikiStore.yaml.yamlContent = '';
    wikiStore.output.isDownloadDisabled = true;

    // before sending request
    wikiStore.table.showSpinner = true;
    wikiStore.wikifier.showSpinner = true;
    wikiStore.yaml.showSpinner = true;

    // send request
    console.log("<TableViewer> -> %c/change_sheet%c for sheet: %c" + sheetName, LOG.link, LOG.default, LOG.highlight);
    try {

      await this.requestService.call(this, () => this.requestService.changeSheet(wikiStore.projects.current!.folder, sheetName));
      console.log("<TableViewer> <- %c/change_sheet%c with:", LOG.link, LOG.default);


      if (wikiStore.yaml.yamlContent) {
        wikiStore.table.isCellSelectable = true;
        wikiStore.output.isDownloadDisabled = false;
      } else {
        wikiStore.table.isCellSelectable = false;
      }


    } catch(error) {
      console.log(error);
    } finally {
      wikiStore.table.showSpinner = false;
      wikiStore.wikifier.showSpinner = false;
      wikiStore.yaml.showSpinner = false;
    }

  }

  styleSelectedCell(selectedCell: Cell, clear = false) {
    let style = { border: "" }

    if (selectedCell.isCell) {
      if (!clear) {
        style = { border: "1px solid hsl(150, 50%, 40%) !important" }
      }
      this.updateStyleByCell(selectedCell.col, selectedCell.row, style);
    } else {
      return;
    }

    const statement = wikiStore.layers.statement.find(selectedCell)
    if (!statement) { return; }

    if (statement.cells.subject) {
      const [col, row] = statement.cells.subject;
      if (!clear) {
        style = { "border": "1px solid black !important" };
      }
      this.updateStyleByCell(col, row, style);
    }

    // qualifiers
    const statementQualifiers = statement.qualifier;
    if (statementQualifiers !== undefined) {
      for (const statementQualifier of statementQualifiers) {
        if (statementQualifier["cell"]) {
          const [q_col, q_row] = statementQualifier["cell"].match(/[a-z]+|[^a-z]+/gi);
          if (!clear) {
            const hue = utils.getHueByQnode(10, statementQualifier.property);
            style = { "border": "1px solid hsl(" + hue + ", 100%, 40%) !important" }
          }
          this.updateStyleByCell(q_col, q_row, style);
        }
      }

    }
  }

  clearSelectedCell(cell: Cell) {
    //a tiny little function with a clearer name for what it does
    this.styleSelectedCell(cell, true);
  }


  async handleSelectCell(params: any) {
    this.setState({ errorMessage: {} as ErrorMessage });

    // get selected cell index
    const value = String(params.value);

    // check if row header, if so, ignore click
    const colName = String(params.colDef["headerName"]);
    if (colName === "") {
      return;
    }

    // else, normal cell
    this.updateSelectedCell(new Cell(params.colIndex, params.rowIndex, value));

  }



  updateSelectedCell(newSelectedCell: Cell) {
    const oldSelectedCell = wikiStore.table.selectedCell;
    this.clearSelectedCell(oldSelectedCell);


    this.setState({
      showToast0: false
    });


    wikiStore.table.selectedCell = newSelectedCell;

    this.setState({
      selectedCell: newSelectedCell,
      showToast0: true,
    });

  }

  updateStyleByCell(colName: string | number | null, rowName: string | number | null, style: any, override?: boolean) {
    if (rowName && colName) {
      const col = colName;
      const row = Number(rowName) - 1;
      const rowData2 = this.state.rowData;
      if (rowData2 !== undefined && rowData2[row] !== undefined) {
        if (rowData2[row]["styles"] === undefined) {
          rowData2[row]["styles"] = {};
        }
        if (override) {
          rowData2[row]["styles"][col] = style;
        } else {
          rowData2[row]["styles"][col] = Object.assign({}, rowData2[row]["styles"][col], style); // combine old and new styles
        }
        this.setState({
          rowData: rowData2
        });

        if (this.gridApi) {
          this.gridApi.setRowData(rowData2);
        } /* else {
          console.warn("Can't update style, gridApi is undefined");
        } */
      }
    } else {
      // console.log("<TableViewer> updated nothing.");
    }
  }

  updateStyleByArray(cellsForStyling: Array<CellIndex>, style: any) {
    const rowData2 = this.state.rowData;
    if (!rowData2) {
      return;
    }
    for (const cell of cellsForStyling) {
      const row = cell[0]
      const col = utils.getColumnTitleFromIndex(cell[1])
      if (rowData2[row] === undefined) continue;
      if (rowData2[row][col] === undefined) continue;
      if (rowData2[row]["styles"] === undefined) { rowData2[row]["styles"] = {}; }
      rowData2[row]["styles"][col] = Object.assign({}, rowData2[row]["styles"][col], style); // combine old and new styles
    }

    this.setState({
      rowData: rowData2
    });
    if (this.gridApi) {
      this.gridApi.setRowData(rowData2);
    }

  }


  styleCellTypeColors() {
    const oldTypes = this.state.styledCellsType;
    this.updateStyleByArray(oldTypes, { backgroundColor: "" })

    let allIndices = Array<CellIndex>();
    const types = wikiStore.layers.type;

    for (const entry of types.entries) {
      allIndices = allIndices.concat(entry.indices)
      const style = utils.typeStyles.get(entry.type)
      if (style == undefined) {
        continue;
        //for now, pass. 
        //later, we may want to generate a random color here, so we can color different qualifiers
      }
      this.updateStyleByArray(entry.indices, style)
    }

    this.setState({
      styledCellsType: allIndices
    })
  }

  toggleDataView(reset = false) {
    console.log("entered toggleDataView")
    const rowData2 = this.state.rowData;
    if (!rowData2) { return; }

    if (reset) {
      const oldCleaned = this.state.styledCellsClean;
      for (const entry of oldCleaned) {
        for (const cell of entry.indices) {
          const row = cell[0]
          const col = utils.getColumnTitleFromIndex(cell[1])
          if (rowData2[row] === undefined) continue;
          if (rowData2[row][col] === undefined) continue;
          rowData2[row][col] = entry.original;
        }
      }
    } else {
      const cleaned = wikiStore.layers.cleaned;
      if (cleaned.entries.length < 1) { return; }

      for (const entry of cleaned.entries) {
        for (const cell of entry.indices) {
          const row = cell[0]
          const col = utils.getColumnTitleFromIndex(cell[1])
          if (rowData2[row] === undefined) continue;
          if (rowData2[row][col] === undefined) continue;
          if (wikiStore.table.showCleanedData) {
            rowData2[row][col] = entry.cleaned;
          } else {
            rowData2[row][col] = entry.original;
          }
        }

      }
    }


    this.setState({
      rowData: rowData2
    });
    if (this.gridApi) {
      this.gridApi.setRowData(rowData2);
    }
  }

  styleCleanedCells() {
    //reset
    let oldCleaned = Array<CellIndex>();
    for (const entry of this.state.styledCellsClean) {
      oldCleaned = oldCleaned.concat(entry.indices);
    }
    this.updateStyleByArray(oldCleaned, { fontWeight: "normal" })
    this.toggleDataView(true); //reset

    //color
    const cleaned = wikiStore.layers.cleaned;
    let allIndices = Array<CellIndex>();
    for (const entry of cleaned.entries) {
      allIndices = allIndices.concat(entry.indices)
    }
    this.updateStyleByArray(allIndices, { fontWeight: "bold" })

    this.setState({
      styledCellsClean: cleaned.entries
    })
    if (wikiStore.table.showCleanedData) { //because we reset above, not necessary if not showing cleaned
      this.toggleDataView();
    }
    return;
  }

  styleQnodeCells() {
    //reset
    const oldQnodes = this.state.styledCellsQnode;
    this.updateStyleByArray(oldQnodes, { color: "" })

    //color
    const qnodes = wikiStore.layers.qnode;
    let allIndices = Array<CellIndex>();
    for (const entry of qnodes.entries) {
      allIndices = allIndices.concat(entry.indices)
    }
    this.updateStyleByArray(allIndices, { color: "hsl(200, 100%, 30%)" })

    this.setState({
      styledCellsQnode: allIndices
    })
  }

  updateTableData() {
    this.setState({
      showTable: false,
      showToast0: false,
      showToast1: false,
    }); //


    console.log("before update the state, file name=", this.state.filename);

    if (wikiStore.projects.projectDTO) {
      const project = wikiStore.projects.projectDTO;
      const filename = project._saved_state.current_data_file
      let sheetNames = null;
      if (filename) {
        sheetNames = project.data_files[filename].val_arr;
        if (sheetNames == undefined) {
          sheetNames = null;
        }
      }

      let multipleSheets = false;
      if (sheetNames && sheetNames.length > 1) {
        multipleSheets = true;
      }
      const currSheetName = project._saved_state.current_sheet;

      let columns;
      let rows;
      if (wikiStore.table.table) {
        columns = getColumns(wikiStore.table.table);
        rows = getRowData(wikiStore.table.table);
      } else {
        columns = defaultColumns;
        rows = defaultRows;
      }


      this.setState({
        filename: filename,
        multipleSheets: multipleSheets,
        sheetNames: sheetNames,
        currSheetName: currSheetName,
        columnDefs: columns,
        rowData: rows,
        showTable: true,
        styledCellsQnode: new Array<CellIndex>(),
        styledCellsType: new Array<CellIndex>(),
        styledCellsClean: new Array<CleanEntry>(),
      });
    }
    else {
      this.setState({
        filename: null,
        multipleSheets: false,
        sheetNames: null,
        currSheetName: null,
        columnDefs: defaultColumns,
        rowData: defaultRows,
        showTable: true,
        styledCellsQnode: new Array<CellIndex>(),
        styledCellsType: new Array<CellIndex>(),
        styledCellsClean: new Array<CleanEntry>(),

      });
    }

    console.log("-----updateTableData---- after update: this.state", this.state)
    // this.gridColumnApi.autoSizeAllColumns();
  }


  onCloseToast(toastNum: string) {
    if (toastNum === 'showToast0') {
      this.setState({ showToast0: false });
    } else {
      this.setState({ showToast1: false });
    }
  }

  render() {
    const { filename, multipleSheets, columnDefs, rowData } = this.state;

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
      <div className={"w-100 h-100 p-1"}>
        {this.state.errorMessage.errorDescription ? <ToastMessage message={this.state.errorMessage} /> : null}
        <Card className="w-100 h-100 shadow-sm">

          {/* header */}
          <Card.Header style={{ height: "40px", padding: "0.5rem 1rem", background: t2wmlColors.TABLE }}>

            {/* title */}
            <div
              className="text-white font-weight-bold d-inline-block text-truncate"
              style={{ width: "calc(100% - 305px)", cursor: "default" }}
            >
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
              onChange={this.handleOpenTableFile}
              onClick={(event) => { (event.target as HTMLInputElement).value = '' }}
            />
          </Card.Header>

          {/* table */}
          <Card.Body className="ag-theme-balham w-100 h-100 p-0" style={{ overflow: "hidden" }}>

            {/* loading spinner */}
            <div className="mySpinner" hidden={!wikiStore.table.showSpinner}>
              <Spinner animation="border" />
            </div>

            <TableToast
              selectedCell={this.state.selectedCell}
              showToast0={this.state.showToast0}
              showToast1={this.state.showToast1}
              msgInToast1={this.state.msgInToast1}
              onCloseToast={(toastNum) => this.onCloseToast(toastNum)}
            />

            <TableLegend multipleSheets={this.state.multipleSheets} />

            {/* table */}
            {/* FUTURE: adapt large dataset by: https://github.com/NeXTs/Clusterize.js */}
            {
              this.state.showTable ?
                <AgGridReact
                  onGridReady={this.onGridReady.bind(this)}
                  columnDefs={columnDefs}
                  rowData={rowData}
                  rowDataChangeDetectionStrategy={ChangeDetectionStrategyType.IdentityCheck}
                  suppressScrollOnNewData={true} // prevent unintended scrolling top after grid updated
                  headerHeight={18}
                  rowHeight={18}
                  rowStyle={{ background: "white" }}
                  defaultColDef={{
                    // All options: https://www.ag-grid.com/javascript-grid-column-properties/

                    // width
                    width: 70,
                    minWidth: 40,
                    // maxWidth: 200,

                    // others
                    editable: false,
                    lockPosition: true,
                    resizable: true,
                    // rowBuffer: 100,
                    sortable: false,
                    // suppressMaxRenderedRowRestriction: true, // 500 rows

                    // color
                    cellClass: function (params) {
                      if (params.colDef.field === "^") {
                        return ["cell", "cell-row-header"];
                      } else {
                        return "cell";
                      }
                    },
                    cellStyle: function (params) {
                      const col = params.colDef.field;
                      // let row = params.node.rowIndex;
                      if (params.data.styles && params.data.styles[col]) {
                        return params.data.styles[col];
                      }
                    },

                    // on cell clicked
                    onCellClicked: this.handleSelectCell,

                    // stop keyboard event
                    suppressKeyboardEvent: () => true,

                    // custom cell renderer (to support hyperlink, ...), significantly degrade performance!
                    // FUTURE: only use custom cell renderer when backend requires
                    // cellRendererFramework: Cell

                  }}
                >
                </AgGridReact>
                : <div />}
          </Card.Body>

          {/* sheet selector */}
          <Card.Footer
            hidden={!multipleSheets}
            id="sheetSelector" // apply custom scroll bar
            style={{
              height: "55px",
              padding: "0.5rem 0.75rem",
              background: "whitesmoke",
              // overflow: "scroll hidden", // safari does not support this
              overflowX: "scroll",
              overflowY: "hidden",
              whiteSpace: "nowrap"
            }}
          >
            <SheetSelector
              sheetNames={this.state.sheetNames}
              currSheetName={this.state.currSheetName}
              handleSelectSheet={(event) => this.handleSelectSheet(event)}
            />
          </Card.Footer>
        </Card>
      </div>
    );
  }
}

export default TableViewer;
