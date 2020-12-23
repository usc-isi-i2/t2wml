//fills in tabledata and the mouse events, renders a "table" with those properties

import React, { Component } from 'react';
import { observer } from 'mobx-react';
import Table from '../table';


interface TableState {
  tableData: any;
}


@observer
class WikificationTable extends Component<{}, TableState> {
  private tableRef = React.createRef<HTMLTableElement>().current!;
  setTableReference(reference?: HTMLTableElement) {
    if ( !reference ) { return; }
    this.tableRef = reference;
  }

  constructor(props: {}) {
    super(props);

    // init state
    this.state = {
      tableData: []
    };
  }

  render() {
    return (
      <Table
        tableData={this.state.tableData}
        setTableReference={this.setTableReference.bind(this)} />
    )
  }
}


export default WikificationTable;
