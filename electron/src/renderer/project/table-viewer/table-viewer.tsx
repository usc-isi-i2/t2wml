import React, { Component } from 'react';

// App
import { Button, Card, OverlayTrigger, Spinner, Tooltip } from 'react-bootstrap';

// Table
import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/dist/styles/ag-grid.css';
import 'ag-grid-community/dist/styles/ag-theme-balham.css';
import { ChangeDetectionStrategyType } from 'ag-grid-react/lib/changeDetectionService';

// console.log
import { LOG, WikifierData, ErrorMessage, Cell } from '../../common/general';
import RequestService from '../../common/service';
import ToastMessage from '../../common/toast';

import { observer } from "mobx-react";
import wikiStore from '../../data/store';
import TableLegend from './table-legend';
import SheetSelector from './sheet-selector';
import TableToast from './table-toast';
import { columns, rows } from './table-definition';
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

interface TableState  {
  showSpinner: boolean;
  showToast0: boolean;  // showing details of current cell
  showToast1: boolean;  // showing temperary messages
  msgInToast1: string,  // message shows in toast 1

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
      isCSV: true,         // csv: true   excel: false
      sheetNames: null,     // csv: null    excel: [ "sheet1", "sheet2", ... ]
      currSheetName: null,  // csv: null    excel: "sheet1"
      columnDefs: columns,
      rowData: rows,

      // temp
      selectedCell: new Cell(),
      yamlRegions: null,

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
    this.disposers.push(reaction(() => wikiStore.table.yamlRegions, (newYamlReg: any) => this.updateYamlRegions(newYamlReg)));
    this.disposers.push(reaction(() => wikiStore.table.qnodes, () => this.updateQnodeCellsFromStore()));
    this.disposers.push(reaction(() => wikiStore.table.rowData, () => this.updateQnodeCellsFromStore()));
    this.disposers.push(reaction(() => wikiStore.table.tableData, (tableData: any) => this.updateTableData(tableData)));
    this.disposers.push(reaction(() => wikiStore.table.wikifierFile, (wikifierFile: File) => this.handleOpenWikifierFile(wikifierFile)));

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

  // shouldComponentUpdate() {
  //   return this.state.showTable;
  // }

  onGridReady(params: WikifierData) {
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

  async handleOpenTableFile(event:any) {
    this.setState({ 
      errorMessage: {} as ErrorMessage,
      showTable: false
    });  
    // remove current status
    wikiStore.table.isCellSelectable = false;
    this.updateSelectedCell();
    wikiStore.table.updateQnodeCells();

    // get table file
    const file = event.target.files[0];
    if (!file) return;

    // before sending request
    wikiStore.table.showSpinner = true;
    wikiStore.wikifier.showSpinner = true;

    // send request
    console.log("<TableViewer> -> %c/upload_data_file%c for table file: %c" + file.name, LOG.link, LOG.default, LOG.highlight);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const json = await this.requestService.uploadDataFile(wikiStore.projects.current!.folder, formData);
      console.log("<TableViewer> <- %c/upload_data_file%c with:", LOG.link, LOG.default);
      console.log(json);

      // do something here
      const { error } = json;

      // if failure
      if (error !== null) {
        throw Error(error);
      }

      // else, success
      const { tableData, wikifierData, yamlData } = json;

      // load table data
      tableData.sheetData.columnDefs[0].pinned = "left"; // set first col pinned at left
      tableData.sheetData.columnDefs[0].width = 40; // set first col 40px width (max 5 digits, e.g. "12345")
      this.setState({
        filename: tableData.filename,
        isCSV: tableData.isCSV,
        sheetNames: tableData.sheetNames,
        currSheetName: tableData.currSheetName,
        columnDefs: tableData.sheetData.columnDefs,
        rowData: tableData.sheetData.rowData,
        showTable: true,
      });
      // this.gridColumnApi.autoSizeAllColumns();

      // load wikifier data
      if (wikifierData !== null) {
        wikiStore.table.updateQnodeCells(wikifierData.qnodes, wikifierData.rowData);
      } else {
        wikiStore.table.updateQnodeCells(); // reset
      }

      // load yaml data
      if (yamlData !== null) {
        wikiStore.yaml.yamlText = yamlData.yamlFileContent;
        wikiStore.table.yamlRegions = yamlData.yamlRegions;
        // this.updateYamlRegions(yamlData.yamlRegions);
        wikiStore.table.isCellSelectable = true;
      } else {
        wikiStore.table.isCellSelectable = false;
      }


      // follow-ups (success)
      wikiStore.table.showSpinner = false;
      wikiStore.wikifier.showSpinner = false;

    } catch(error) {
      console.log(error);
      error.errorDescription += "\n\nCannot upload data file!";
      this.setState({ errorMessage: error });
    
      // follow-ups (failure)
      wikiStore.table.showSpinner = false;
      wikiStore.wikifier.showSpinner = false;
    }
  }

  async handleOpenWikifierFile(file: File) {
    this.setState({ errorMessage: {} as ErrorMessage });
    // remove current status
    wikiStore.table.updateQnodeCells();

    if (!file) return;

    // before sending request
    wikiStore.table.showSpinner = true;
    wikiStore.wikifier.showSpinner = true;

    // send request
    console.log("<TableViewer> -> %c/upload_wikifier_output%c for wikifier file: %c" + file.name, LOG.link, LOG.default, LOG.highlight);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const json = await this.requestService.uploadWikifierOutput(wikiStore.projects.current!.folder, formData);
      console.log("<TableViewer> <- %c/upload_wikifier_output%c with:", LOG.link, LOG.default);
      console.log(json);

      // do something here
      const { error } = json;

      // if failure
      if (error) {
        throw Error(error);
      }

      // else, success
      const { qnodes, rowData } = json;
      wikiStore.table.updateQnodeCells(qnodes, rowData);

      // follow-ups (success)
      this.setState({
        // showSpinner: false,
        msgInToast1: "✅ Wikifier file loaded",
        showToast1: true,
      });
      wikiStore.table.showSpinner = false;
      wikiStore.wikifier.showSpinner = false;

    } catch(error) {
      console.log(error);
      error.errorDescription += "\n\nCannot upload wikifier file!";
      this.setState({ errorMessage: error });

      // follow-ups (failure)
      wikiStore.table.updateQnodeCells();
      wikiStore.table.showSpinner = false;
      wikiStore.wikifier.showSpinner = false;
    }
  }

  async handleSelectCell(params: any) { 
    this.setState({ errorMessage: {} as ErrorMessage });
    // remove current status
    this.updateSelectedCell();
    wikiStore.output.clearOutput();

    // get selected cell index
    const colName = String(params.colDef["headerName"]);
    const rowName = params.rowIndex + 1;
    const value = String(params.value);

    // check if row header
    if (colName === "") {
      console.log("<TableViewer> clicked row: %c[" + rowName + "]", LOG.highlight);
      return;
    }

    // else, normal cell
    this.updateSelectedCell(colName, rowName, value);

    // Check if this cell in data region list (in green cells)
    if (!wikiStore.table.dataRegionsCells.includes(colName+rowName) ) {
      return
    }

    // before sending request
    if (!wikiStore.table.isCellSelectable) return;
    wikiStore.table.showSpinner = true;
    wikiStore.output.showSpinner = true;

    // send request
    console.log("<TableViewer> -> %c/resolve_cell%c for cell: %c" + colName + rowName + "%c " + value, LOG.link, LOG.default, LOG.highlight, LOG.default);
    try {
      const json = await this.requestService.resolveCell(wikiStore.projects.current!.folder, colName, rowName);
      console.log("<TableViewer> <- %c/resolve_cell%c with:", LOG.link, LOG.default);
      console.log(json);

    //   const { error } = json;
    //   // if failure      
    //   if (error) {
    //     throw {errorDescription: error.value} as ErrorMessage;
    //   }

      // else, success
      const {internalErrors} = json;
      if (internalErrors){
            console.log(internalErrors);
      }
      wikiStore.output.updateOutput(colName, rowName, json)

      // follow-ups (success)
      wikiStore.output.showSpinner = false;
      wikiStore.table.showSpinner = false;
    } catch(error) {
      console.log(error);
    //   error.errorDescription += "\n\nCannot resolve cell!";
      this.setState({ errorMessage: error });

      // follow-ups (failure)
      wikiStore.output.showSpinner = false;
      wikiStore.table.showSpinner = false;
    }
  }

  async handleSelectSheet(event: any) {
    this.setState({ 
      errorMessage: {} as ErrorMessage,
      showTable: false
    });
    // remove current status
    this.updateSelectedCell();
    wikiStore.yaml.yamlText = undefined;
    // this.updateYamlRegions();
    wikiStore.table.yamlRegions = undefined;
    wikiStore.table.updateQnodeCells();
    wikiStore.output.clearOutput();
    wikiStore.output.isDownloadDisabled = true;

    // before sending request
    wikiStore.table.showSpinner = true;
    wikiStore.wikifier.showSpinner = true;

    // send request
    const sheetName = event.target.innerHTML;
    console.log("<TableViewer> -> %c/change_sheet%c for sheet: %c" + sheetName, LOG.link, LOG.default, LOG.highlight);
    try{ 
      const json = await this.requestService.changeSheet(wikiStore.projects.current!.folder, sheetName);
      console.log("<TableViewer> <- %c/change_sheet%c with:", LOG.link, LOG.default);
      console.log(json);

    
      const { tableData, wikifierData, yamlData } = json;

      // load table data
      tableData.sheetData.columnDefs[0].pinned = "left"; // set first col pinned at left
      tableData.sheetData.columnDefs[0].width = 40; // set first col 40px width (max 5 digits, e.g. "12345")
      this.setState({
        filename: tableData.filename,
        isCSV: tableData.isCSV,
        // sheetNames: tableData.sheetNames, // backend would not send this
        currSheetName: tableData.currSheetName,
        columnDefs: tableData.sheetData.columnDefs,
        rowData: tableData.sheetData.rowData,
        showTable: true,
      });
      // this.gridColumnApi.autoSizeAllColumns();

      // load wikifier data
      if (wikifierData !== null) {
        wikiStore.table.updateQnodeCells(wikifierData.qnodes, wikifierData.rowData);
      } else {
        wikiStore.table.updateQnodeCells(); // reset
      }

      // load yaml data
      if (yamlData !== null) {
        wikiStore.yaml.yamlText = yamlData.yamlFileContent;
        // this.updateYamlRegions(yamlData.yamlRegions);
        wikiStore.table.yamlRegions = yamlData.yamlRegions;
        wikiStore.table.isCellSelectable = true;
        wikiStore.output.isDownloadDisabled = false;
      } else {
        wikiStore.table.isCellSelectable = false;
      }


      // follow-ups (success)
      wikiStore.table.showSpinner = false;
      wikiStore.wikifier.showSpinner = false;

    } catch(error) {
      console.log(error);
      error.errorDescription += "\n\nCannot change sheet!";
      this.setState({ errorMessage: error });

      // follow-ups (failure)
      wikiStore.table.showSpinner = false;
      wikiStore.wikifier.showSpinner = false;
    }
  }


  updateQnodeCellsFromStore() {
    const qnodeData = wikiStore.table.qnodes;
    const rowData = wikiStore.table.rowData;
    if (!qnodeData) {
      // reset qnode cells
      if (!wikiStore.wikifier.qnodeData) return;
      const qnodes = Object.keys(wikiStore.wikifier.qnodeData);
      if (qnodes.length === 0) return;
      const cells = { qnode: { list: qnodes } };
      const presets = {
        qnode: { color: "" }
      };
      this.updateStyleByDict(cells, presets);

      // reset wikifier data
      wikiStore.wikifier.updateWikifier();

    } else {
      // update qnode cells

      // const qnodes = Object.keys(Object.fromEntries(Object.entries(qnodeData).filter(([k, v]) => v !== "")));
      const qnodes = Object.keys(qnodeData);
      const cells = { qnode: { list: qnodes } };
      const presets = {
        qnode: { color: "hsl(200, 100%, 30%)" }
      };
      this.updateStyleByDict(cells, presets);

      // update wikifier data
      wikiStore.wikifier.updateWikifier(qnodeData, rowData);
    }
  }

  updateSelectedCell(col: string | null = null, row: number | null = null, value: string | null = null) {
    if (col === null) {
      // reset
      const { selectedCell } = this.state;
      if (selectedCell !== null) {
        wikiStore.table.updateStyleByCell(selectedCell.col, selectedCell.row, { border: "" });
      }
      this.setState({
        selectedCell: null,
        showToast0: false
      });
    } else {
      // update
      wikiStore.table.updateStyleByCell(col, row, { border: "1px solid hsl(150, 50%, 40%) !important" });
      this.setState({
        selectedCell: { col: col, row: row, value: value },
        showToast0: true,
      });
    }

  }

  updateStyleByCellFromStore() {
    const colName = wikiStore.table.styledColName; 
    const rowName = wikiStore.table.styledRowName; 
    const style = wikiStore.table.styleCell; 
    const override = wikiStore.table.styledOverride;

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

  getColAndRow(cellName: string) {
    const chars = cellName.slice(0, cellName.search(/\d/));
    const nums = cellName.replace(chars, '');
    return {col: chars, row: nums};
  }


  updateStyleByDict(dict: any, presets: any, override = false) {
    // dict = { "styleName": ["A1", "A2", ...] }
    // window.TableViewer.updateStyleByDict({ "data_region": ["A14", "A15"], "qualifier_region": ["B14", "B15"], "item": ["C14", "C15"] });
    const rowData2 = this.state.rowData;
    if (!rowData2) {
      return;
    }

    const styleNames = Object.keys(presets);
    for (let i = 0; i < styleNames.length; i++) {
      const styleName = styleNames[i];
    
      let cells = undefined;
      if (dict[styleName]){
       cells = dict[styleName]['list'];
      }
      if (cells === undefined) continue;
      for (let j = 0; j < cells.length; j++) {
        const [col, row1Based] = cells[j].match(/[a-z]+|[^a-z]+/gi);
        const row = row1Based - 1;
        if (rowData2[row] === undefined) continue;
        if (rowData2[row][col] === undefined) continue;
        if (rowData2[row]["styles"] === undefined) { rowData2[row]["styles"] = {}; }
        if (override) {
          rowData2[row]["styles"][col] = presets[styleName];
        } else {
          rowData2[row]["styles"][col] = Object.assign({}, rowData2[row]["styles"][col], presets[styleName]); // combine old and new styles
        }
      }
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

  updateTableData(tableData?: TableData) {
    this.setState({ showTable: false }); //

    if (tableData?.sheetData) {
      tableData.sheetData.columnDefs[0].pinned = "left"; // set first col pinned at left
      tableData.sheetData.columnDefs[0].width = 40; // set first col 40px width (max 5 digits, e.g. "12345")
    }

    console.log("before update the state, file name=", this.state.filename);
    this.setState({
      filename: tableData?.filename || null,
      isCSV: tableData?.isCSV || false,
      sheetNames: tableData?.sheetNames || null,
      currSheetName: tableData?.currSheetName || null,
      columnDefs: tableData?.sheetData?.columnDefs || columns,
      rowData: tableData?.sheetData?.rowData || rows,
      showTable: true,
      showToast0: false,
      showToast1: false,
    });
    console.log("-----updateTableData---- after update: this.state", this.state)
    // this.gridColumnApi.autoSizeAllColumns();
  }

  updateYamlRegions(newYamlRegions: any = undefined) {
    if (!newYamlRegions) {
      // reset
      const { yamlRegions } = this.state;
      if (yamlRegions === null) return;
      const presets = {
        item: { backgroundColor: "" },
        qualifierRegion: { backgroundColor: "" },
        dataRegion: { backgroundColor: "" },
        skippedRegion: { backgroundColor: "" },
        errorCells: { backgroundColor: "" },
        dangerCells: { backgroundColor: "" }
      }
      this.updateStyleByDict(yamlRegions, presets);
      this.setState({ yamlRegions: null });
    } else {
      // update
      const presets = {
        item: { backgroundColor: newYamlRegions['item']['color'] }, // blue
        qualifierRegion: { backgroundColor: newYamlRegions['qualifierRegion']['color'] }, // violet
        dataRegion: { backgroundColor: newYamlRegions['dataRegion']['color'] }, // green
        // skippedRegion: { backgroundColor: "hsl(0, 0%, 90%)" }, // gray
        errorCells: { backgroundColor: newYamlRegions['errorCells']['color'] },
        dangerCells: { backgroundColor: newYamlRegions['dangerCells']['color'] },
      }
      this.updateStyleByDict(newYamlRegions, presets);
      this.setState({ yamlRegions: newYamlRegions });
    }
  }

  onCloseToast(toastNum: string) {
      if (toastNum === 'showToast0') {
        this.setState({ showToast0: false });
      } else {
        this.setState({ showToast1: false });
      }
  }

  render() {
    // console.log(this.state);

    // const { showToast0, showToast1, msgInToast1 } = this.state;
    const { filename, isCSV, columnDefs, rowData } = this.state;
    // const { selectedCell } = this.state;

    // let msgInToast0;
    // if (selectedCell === null) {
    //   msgInToast0 = "No cell selected";
    // } else {
    //   msgInToast0 = "{ $col: " + selectedCell.col + ", $row: " + selectedCell.row + " }";
    // }

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
            
            {/* TODO: move following inputs to another place */}
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

            <TableLegend isCSV={this.state.isCSV} />

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
           : <div /> }
          </Card.Body>

          {/* sheet selector */}
          <Card.Footer
            hidden={isCSV}
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
