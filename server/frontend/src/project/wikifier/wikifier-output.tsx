import React, { Component } from 'react';

// Table
import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/dist/styles/ag-grid.css';
import 'ag-grid-community/dist/styles/ag-theme-balham.css';

// console.log
import { WikifierData } from '../../common/general';
import * as utils from '../../common/utils'
import QnodeEditor from '../qnode-editor';

import { observer } from "mobx-react"

interface WikifierOutputProperties {
    rowData: Array<any>;
}

interface WikifierOutputState {
}

@observer
class WikifierOutput extends Component<WikifierOutputProperties, WikifierOutputState> {
  public gridApi: any;
  public gridColumnApi: any;

  constructor(props: WikifierOutputProperties) {
    super(props);

  }

  onGridReady(params: WikifierData) {
    // store the api
    this.gridApi = params.api;
    this.gridColumnApi = params.columnApi;
    // console.log("<Wikifier> inited ag-grid and retrieved its API");

    // FOR TEST ONLY
    // const qnodeData = { "A1": { "Context 1": { "item": "Q967", "label": "label", "desc": "dsc" }, "Context 2": { "item": "Q971", "label": "label", "desc": "dsc" } }, "B1": { "Context 1": { "item": "Q97", "label": "label", "desc": "dsc" }, "Context 2": { "item": "Q67", "label": "label", "desc": "dsc" } }, "C1": { "Context 1": { "item": "Q9", "label": "label", "desc": "dsc" } }, "D1": { "Context 3": { "item": "Q967", "label": "label", "desc": "dsc" } } };
    // const rowData = [{ "context": "country", "col": "A", "row": "148989", "value": "Burundi", "item": "Q967", "label": "Burundi", "desc": "country in ..." }, { "context": "country", "col": "B", "row": "1", "value": "Bundi", "item": "Q967", "label": "Burundi", "desc": "country in ..." }, { "context": "", "col": "D", "row": "1", "value": "Burundi", "item": "Q967", "label": "Burundi", "desc": "country in ..." }, { "context": "city", "col": "C", "row": "1", "value": "Bu", "item": "Q967", "label": "Burundi", "desc": "country in ..." }];
    // this.updateWikifier(qnodeData, rowData);

    this.gridApi.sizeColumnsToFit();

    // default sort
    const defaultSortModel = [
      { colId: "col", sort: "asc" },
      { colId: "row", sort: "asc" }
    ];
    params.api.setSortModel(defaultSortModel);
  }

  tableColComparator(col1: string, col2: string) {
    const col1Idx = utils.colName2colIdx(col1);
    const col2Idx = utils.colName2colIdx(col2);
    return col1Idx - col2Idx;
  }

  tableRowComparator(row1: string, row2: string) {
    const row1Idx = parseInt(row1);
    const row2Idx = parseInt(row2);
    return row1Idx - row2Idx;
  }


  render() {
    const { rowData } = this.props;
    return (
    <div
        className="ag-theme-balham w-100 h-100"
        style={{
        display: "inline-block",
        overflow: "hidden"
        }}
    >
        <AgGridReact
            onGridReady={this.onGridReady.bind(this)}
            frameworkComponents={{
            qnodeEditor: QnodeEditor
            }}
            columnDefs={[
            {

                headerName: "",
                children: [
                { headerName: "context", field: "context", width: 60 }
                ]
            },
            {
                headerName: "Table",
                children: [
                { headerName: "col", field: "col", width: 60, comparator: this.tableColComparator, sortable: true },
                { headerName: "row", field: "row", width: 60, comparator: this.tableRowComparator, sortable: true },
                { headerName: "value", field: "value", width: 80 },
                ]
            },
            {
                headerName: "Wikidata",
                children: [
                {

                    headerName: "item", field: "item", width: 60,
                    cellStyle: { color: "hsl(200, 100%, 30%)" },
                    // **** QNODE EDITOR ************************************************
                    // editable: true, cellEditor: "qnodeEditor",
                    // onCellValueChanged: (params) => { this.handleUpdateQnode(params) }
                    // ******************************************************************
                },
                { headerName: "label", field: "label", width: 80 },
                { headerName: "description", field: "desc", width: 160 }
                ]
            }
            ]}
            rowData={rowData}
            suppressScrollOnNewData={true}
            headerHeight={18}
            rowHeight={18}
            rowStyle={{ background: "white" }}
            defaultColDef={{
            minWidth: 40,
            lockPosition: true,
            resizable: true,
            sortable: false,
            }}
        >
        </AgGridReact>
      </div>
    );
  }
}

export default WikifierOutput;
