import React, { Component, Fragment } from 'react';

import { Card, Spinner} from 'react-bootstrap';

import RequestService from '../../common/service';
import { observer } from "mobx-react"
import wikiStore from '../../data/store';
import { reaction, IReactionDisposer } from 'mobx';
import Table from '../table/table';
import { TableCell, TableData, TableDTO } from '@/renderer/common/dtos';
import "../project.css";


interface PartialCsvState {
  partialCsv?: TableData;
  showSpinner: boolean;
  rowData: Array<any>
}

@observer
class PartialCsvPreview extends Component<{}, PartialCsvState> {
  public gridApi: any;
  public gridColumnApi: any;

  constructor(props: {}) {
    super(props);
    this.requestService = new RequestService();

    // init state
    this.state = {
      partialCsv: undefined,
      // appearance
      showSpinner: wikiStore.wikifier.showSpinner, //false,

      // table data
      rowData: [],
    };
  }

  private disposers: IReactionDisposer[] = [];

  componentDidMount() {
    this.disposers.push(reaction(() => wikiStore.layers.partialCsv, (table) => this.updateTableData(table)));
  }

  componentWillUnmount() {
    for (const disposer of this.disposers) {
      disposer();
    }
  }

  updateTableData(table?: TableDTO) {
    if ( !table || !table.cells ) {
      this.setState({ partialCsv: undefined });
      return;
    }
    const tableData = [];
    for ( let i = 0; i < table.cells.length; i++ ) {
      const rowData = [];
      for ( let j = 0; j < table.cells[i].length; j++ ) {
        const cell: TableCell = {
          content: table.cells[i][j],
          classNames: [],
        };
        rowData.push(cell);
      }
      tableData.push(rowData);
    }
    this.setState({ partialCsv: tableData });
  }

  render() {
    return (
      <Fragment>
        <Card
          className="shadow-sm"
          style={{ height: "88vh"}}>

          {/* wikifier */}
          <Card.Body className="p-0">

            <div className="mySpinner" hidden={!wikiStore.wikifier.showSpinner}>
              <Spinner animation="border" />
            </div>

            {/* wikifier output */}
            <div className="w-100 h-100">
              <Table
              minCols={6}
              tableData={this.state.partialCsv}
              setTableReference={()=>(null)}/>
            </div>
          </Card.Body>
        </Card >
      </Fragment>
    );
  }
}

export default PartialCsvPreview;
