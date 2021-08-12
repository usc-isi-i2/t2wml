import React from 'react';
import 'react-virtualized/styles.css'
import { Column, Table as VirtualizedTable, TableCellDataGetterParams, TableCellProps } from 'react-virtualized/dist/commonjs/Table';

import * as utils from './table-utils';
import { TableCell, TableData } from '../../common/dtos';
import TableCellItem from './tableCellItem';
import './table-virtual.css'
import wikiStore from '@/renderer/data/store';
import { AutoSizer } from 'react-virtualized';
import { IReactionDisposer, reaction } from 'mobx';

export const DEFAULT_CELL_STATE = {
  active: false,
  activeTop: false,
  activeLeft: false,
  activeRight: false,
  activeBottom: false,
  activeCorner: false,
  highlight: false,
  maxWidth: false,
  qnode: false
}

interface TableProperties {
  tableData: TableData;
  ableActivated?: boolean;
  onMouseUp?: (event: React.MouseEvent) => void;
  onMouseDown?: (event: React.MouseEvent) => void;
  onMouseMove?: (event: React.MouseEvent) => void;
  onClickHeader?: (event: React.MouseEvent) => void;
  MIN_ROWS: number;
  MIN_COLUMNS: number;

  rowCount: number;
  rowGetter: (index: number) => TableCell[];
}


class Table extends React.Component<TableProperties, { rowHeight: number, columnWidth: number }>{

  private tableRef: any;
  private disposers: IReactionDisposer[] = [];

  constructor(props: TableProperties) {
    super(props);

    this.state = {
      rowHeight: 25,
      columnWidth: 75
    }

    this.tableRef = null;
  }

  componentDidMount() {
    this.disposers.push(reaction(() => wikiStore.table.showQnodes, () => this.updateShowQNodes()));
    this.disposers.push(reaction(() => wikiStore.table.table, () => this.scrolToTop()));
  }

  componentWillUnmount() {
    for (const disposer of this.disposers) {
      disposer();
    }
  }

  scrolToTop(){
    this.tableRef.scrollToPosition(0);
  }

  updateShowQNodes() {
    console.log("updateShowQNodes");
    if (wikiStore.table.showQnodes) {
      this.setState({ rowHeight: 60, columnWidth: 90 }, () => {
        this.tableRef.recomputeRowHeights();
        this.tableRef.forceUpdateGrid();
      })
    } else {
      this.setState({ rowHeight: 25, columnWidth: 75 }, () => {
        this.tableRef.recomputeRowHeights();
        this.tableRef.forceUpdateGrid();
      })
    }
  }

  setTableReference(reference: VirtualizedTable | null) {
    if (!reference) { return; }
    this.tableRef = reference;
  }

  rowGetter(index: number) {
    return this.props.rowGetter(index);
  }

  render() {
    const {
      tableData,
      onMouseUp,
      onMouseDown,
      onMouseMove,
      onClickHeader,
      ableActivated,
      // MIN_COLUMNS,
      // MIN_ROWS,

      rowCount
    } = this.props;

    const { rowHeight, columnWidth } = this.state

    console.log("render tableData")
    // // add one column and one row to the table:
    // for (let index = 0; index < Object.keys(tableData).length; index++) {
    //   const rowData = tableData[index]
    //   while (rowData.length < MIN_COLUMNS + 1) { // add columns to the display table
    //     rowData.push({
    //       content: '',
    //       rawContent: '',
    //       classNames: [],
    //       ...DEFAULT_CELL_STATE
    //     })
    //   }
    // }

    // while (Object.keys(tableData).length < MIN_ROWS + 1) { // add rows to the display table
    //   const rowData = [];
    //   while (rowData.length < MIN_COLUMNS + 1) {
    //     rowData.push({
    //       content: '',
    //       rawContent: '',
    //       classNames: [],
    //       ...DEFAULT_CELL_STATE
    //     })
    //   }
    //   tableData[Object.keys(tableData).length] = rowData;
    // }

    // while (Object.keys(tableData).length < rowCount) { // add rows to the display table
    //   const rowData = [];
    //   while (rowData.length < MIN_COLUMNS + 1) {
    //     rowData.push({
    //       content: '',
    //       rawContent: '',
    //       classNames: [],
    //       ...DEFAULT_CELL_STATE
    //     })
    //   }
    //   tableData[Object.keys(tableData).length] = rowData;
    // }

    return (
      <div
        className='table-wrapper'
        onMouseUp={(event) => (onMouseUp ? onMouseUp(event) : null)}
        onMouseDown={(event) => (onMouseDown ? onMouseDown(event) : null)}
        onMouseMove={(event) => (onMouseMove ? onMouseMove(event) : null)}
      >
        <AutoSizer disableWidth>
          {
            (Size: { height: number }) => {
              return (
                <VirtualizedTable id="virtualized-table"
                  height={Size.height}
                  width={tableData[0].length * columnWidth}
                  className={wikiStore.table.selection.selectionArea && ableActivated ? 'active' : ''}
                  headerHeight={rowHeight}
                  rowHeight={rowHeight}
                  // scrollTop
                  ref={(ref: VirtualizedTable | null) => this.setTableReference(ref)}
                  rowCount={rowCount}
                  rowGetter={({ index }) => this.rowGetter(index)}
                >

                  <Column
                    label=''
                    dataKey=''
                    headerRenderer={() => <div>&nbsp;</div>}
                    width={50}
                    cellDataGetter={data => {
                      return data.rowData[data.dataKey]
                    }}
                    cellRenderer={data => {
                      return <div>{data.rowIndex + 1}</div>
                    }}
                  />

                  {Object.keys(tableData[0]).map((r, i) => (
                    <Column key={`col-${i}`}
                      label={utils.columnToLetter(i + 1)}
                      dataKey={i.toString()}
                      headerRenderer={data => {
                        return (
                          <div
                            data-row-index={0}
                            data-col-index={i + 1}
                            onDoubleClick={(event) => (onClickHeader ? onClickHeader(event) : null)}>
                            {data.label}
                          </div>
                        )
                      }}
                      width={columnWidth}
                      cellDataGetter={(data: TableCellDataGetterParams) => {
                        return data.rowData[data.dataKey]
                      }}
                      cellRenderer={(data: TableCellProps) => {
                        if (data.isScrolling && data.cellData && data.cellData.length && data.cellData[1].content) {
                          return (<div style={{ color: 'lightgray' }}> scrolling... </div>);
                        }
                        return (
                          <TableCellItem cellData={data.cellData} rowIndex={data.rowIndex} columnIndex={data.columnIndex} />
                        );
                      }
                      }
                    />
                  ))}

                </VirtualizedTable>
              )
            }}
        </AutoSizer>
      </div >
    )
  }
}

export default Table
