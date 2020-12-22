import React, { Component } from 'react';

// Table
import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/dist/styles/ag-grid.css';
import 'ag-grid-community/dist/styles/ag-theme-balham.css';

// console.log
import { gridApiInterface } from '../../common/general';
import * as utils from '../../common/utils'

import { observer } from "mobx-react"

interface WikifierOutputProperties {
  rowData: Array<any>;
}

@observer
class WikifierOutput extends Component<WikifierOutputProperties, {}> {
  public gridApi: any;
  public gridColumnApi: any;

  onGridReady(params: gridApiInterface) {
    // store the api
    this.gridApi = params.api;
    this.gridColumnApi = params.columnApi;

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

                  headerName: "id", field: "id", width: 60,
                  cellStyle: { color: "hsl(200, 100%, 30%)" },
                },
                { headerName: "label", field: "label", width: 80 },
                { headerName: "description", field: "description", width: 160 }
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
