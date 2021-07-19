import React from 'react';
import 'react-virtualized/styles.css'
import { Column, Table as VirtualizedTable, TableCellDataGetterParams, TableCellProps } from 'react-virtualized/dist/commonjs/Table';

import * as utils from './table-utils';
import { DEFAULT_CELL_STATE, TableData } from '../../common/dtos';
import TableCellItem from './tableCellItem';
import './table-virtual.css'
import wikiStore from '@/renderer/data/store';
import { AutoSizer } from 'react-virtualized';


interface TableProperties {
  tableData?: TableData;
  ableActivated?: boolean;
  onMouseUp?: (event: React.MouseEvent) => void;
  onMouseDown?: (event: React.MouseEvent) => void;
  onMouseMove?: (event: React.MouseEvent) => void;
  onClickHeader?: (event: React.MouseEvent) => void;
  setTableReference: any;
  MIN_ROWS: number;
  MIN_COLUMNS: number;
}


class Table extends React.Component<TableProperties>{

  constructor(props: TableProperties) {
    super(props);
  }

  render() {
    const {
      tableData,
      onMouseUp,
      onMouseDown,
      onMouseMove,
      onClickHeader,
      setTableReference,
      ableActivated,
      MIN_COLUMNS,
      MIN_ROWS
    } = this.props;


    if (!tableData) {
      return null;
    }
    console.log("render tableData")
    // add one column and one row to the table:
    for (let index = 0; index < tableData.length; index++) {
      const rowData = tableData[index]
      while (rowData.length < MIN_COLUMNS + 1) { // add columns to the display table
        rowData.push({
          content: '',
          rawContent: '',
          classNames: [],
          ...DEFAULT_CELL_STATE
        })
      }
    }

    while (tableData.length < MIN_ROWS + 1) { // add rows to the display table
      const rowData = [];
      while (rowData.length < MIN_COLUMNS + 1) {
        rowData.push({
          content: '',
          rawContent: '',
          classNames: [],
          ...DEFAULT_CELL_STATE
        })
      }
      tableData.push(rowData);
    }

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
                  width={tableData[0].length * 75}
                  className={wikiStore.table.selection && ableActivated ? 'active' : ''}
                  headerHeight={25}
                  rowHeight={25}
                  ref={setTableReference}
                  rowCount={Object.keys(tableData).length}
                  rowGetter={({ index }) => { return Object.entries(tableData[index]) }}
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
                      width={75}
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
