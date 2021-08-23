import React, { Component, Fragment } from 'react';

import { Card, Spinner } from 'react-bootstrap';
import { observer } from "mobx-react"
import wikiStore from '../../data/store';
import { reaction, IReactionDisposer } from 'mobx';
import Table, { DEFAULT_CELL_STATE } from '../table/table';
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

    // init state
    this.state = {
      partialCsv: undefined,
      // appearance
      showSpinner: wikiStore.partialCsv.showSpinner, //false,

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
    if (!table || !table.cells) {
      this.setState({ partialCsv: undefined });
      return;
    }
    const tableData = [];
    const emptyCell: TableCell = {
      content: '',
      classNames: [],
      ...DEFAULT_CELL_STATE
    };
    const tableLength = table.cells.length
    for (let i = 0; i < Math.min(tableLength, 150); i++) {
      const rowData = [];
      let j = 0;
      for (; j < table.cells[0].length + 1; j++) {
        const cell: TableCell = {
          content: i > tableLength ? '' : table.cells[i][j],
          classNames: [],
          ...DEFAULT_CELL_STATE
        };
        rowData.push(cell);
      }
      for (; j < 10; j++) {
        rowData.push(emptyCell);
      }
      rowData.push(emptyCell);
      tableData.push(rowData);
    }
    const rowData = [];
    for (let k = 0; k < Math.max(table.cells[0].length, 10) + 1; k++) { // add one extra row
      rowData.push(emptyCell);
    }
    tableData.push(rowData);
    this.setState({ partialCsv: tableData });
  }

  render() {
    const { partialCsv } = this.state;
    return (
      <Fragment>
        <Card
          className="shadow-sm"
          style={{ height: "90vh" }}
          >

          {/* wikifier */}
          <Card.Body className="p-0">

            <div className="mySpinner" hidden={!wikiStore.partialCsv.showSpinner}>
              <Spinner animation="border" />
            </div>

            {/* wikifier output */}
            <div className="w-100 h-100">
              {
                partialCsv && Object.keys(partialCsv).length > 1 ?
                  <Table
                    tableData={partialCsv}
                    MIN_ROWS={0}
                    MIN_COLUMNS={6}
                    rowGetter={(index: number) => { return partialCsv[index]; }}
                    rowCount={Object.keys(partialCsv).length} />
                  :
                  <div style={{ padding: '2rem' }}>
                    <h6>
                      In order to annotate the data:
                    </h6>
                    <h6>
                      1. Select the main subject
                    </h6>
                    <h6>
                      2. Select the dependent variable
                    </h6>
                    <h6>
                      3. Select data properties and qualifiers
                    </h6>
                  </div>
              }

            </div>
          </Card.Body>
        </Card >
      </Fragment>
    );
  }
}

export default PartialCsvPreview;
