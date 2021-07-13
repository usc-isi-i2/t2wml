import React from 'react';
import 'react-virtualized/styles.css'
import { Column, Table as VirtualizedTable, TableCellDataGetterParams, TableCellProps } from 'react-virtualized/dist/commonjs/Table';
import { AutoSizer } from 'react-virtualized/dist/es/AutoSizer';

import * as utils from './table-utils';
import { TableData } from '../../common/dtos';
import TableCellItem from './tableCellItem';
import './table-virtual.css'
import wikiStore from '@/renderer/data/store';


interface TableProperties {
  tableData?: TableData;
  ableActivated?: boolean;
  onMouseUp?: (event: React.MouseEvent) => void;
  onMouseDown?: (event: React.MouseEvent) => void;
  onMouseMove?: (event: React.MouseEvent) => void;
  onClickHeader?: (event: React.MouseEvent) => void;
  setTableReference: any;
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
      ableActivated
    } = this.props;


    if (!tableData) {
      return null;
    }

    return (
      <div
        className='table-wrapper'
        onMouseUp={(event) => (onMouseUp ? onMouseUp(event) : null)}
        onMouseDown={(event) => (onMouseDown ? onMouseDown(event) : null)}
        onMouseMove={(event) => (onMouseMove ? onMouseMove(event) : null)}
      >
        <AutoSizer>
          {
            (Size: { height: number, width: number }) => {
              return (
                <VirtualizedTable id="virtualized-table"
                  height={Size.height}
                  width={Size.width}
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
                      width={100}
                      cellDataGetter={(data: TableCellDataGetterParams) => {
                        return data.rowData[data.dataKey]
                      }}
                      cellRenderer={(data: TableCellProps) => {
                        return (
                          <TableCellItem cellData={data.cellData} rowIndex={data.rowIndex} columnIndex={data.columnIndex} />
                        )
                      }}
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
