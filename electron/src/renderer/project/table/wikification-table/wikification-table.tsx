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
    if (!reference) { return; }
    this.tableRef = reference;
  }

  constructor(props: {}) {
    super(props);

    // init state
    this.state = {
      tableData: []
    };
  }

  handleOnMouseDown(event: React.MouseEvent) {
    //TODO
  }

  render() {
    return (
      <Table
        tableData={this.state.tableData}
        onMouseUp={() => void 0}
        onMouseDown={this.handleOnMouseDown.bind(this)}
        onMouseMove={() => void 0}
        onClickHeader={() => void 0}
        setTableReference={this.setTableReference.bind(this)} />
    )
  }
}


export default WikificationTable;
