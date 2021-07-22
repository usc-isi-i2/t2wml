import React from 'react';
import 'react-virtualized/styles.css'
import { AutoSizer, Grid, ScrollSync } from 'react-virtualized';
import scrollbarSize from 'dom-helpers/scrollbarSize';

import * as utils from './table-utils';
import { DEFAULT_CELL_STATE, TableCell, TableData } from '../../common/dtos';
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
  MIN_ROWS: number;
  MIN_COLUMNS: number;
}


class Table extends React.Component<TableProperties>{

  constructor(props: TableProperties) {
    super(props);
  }

  _renderBodyCell(data: TableCell, rowIndex: number, columnIndex: number, style: any) {
    if (!data) {
      return;
    }
    // const rowClass = this.getRowClass(rowIndex, columnIndex)
    // const classNames = rowClass + " " + "cell";

    return (

      <div className="cell" key={`${rowIndex} ${columnIndex}`} style={style}>
        {/* {rowIndex} {columnIndex} */}
        <TableCellItem cellData={data} rowIndex={rowIndex} columnIndex={columnIndex} />
      </div>
    );
  }

  _renderLeftHeaderCell(rowIndex: number, columnIndex: number, style: any) {
    return (
      <div className="headerCell headerLeftCell" key={`${rowIndex} ${columnIndex}`}
        style={style}>
      </div>
    );
  }

  getRowClass(rowIndex: number, columnIndex: number) {
    const rowClass =
      rowIndex % 2 === 0
        ? columnIndex % 2 === 0
          ? "evenRow"
          : "oddRow"
        : columnIndex % 2 !== 0
          ? "evenRow"
          : "oddRow";
    return rowClass
  }

  _renderLeftSideCell(rowIndex: number, columnIndex: number, style: any) {
    const rowClass = this.getRowClass(rowIndex, columnIndex)
    const classNames = rowClass + " " + "cell" + " " + "leftCell";

    return (
      <div className={classNames} key={`${rowIndex} leftCell`} style={style}>
        {rowIndex + 1}
      </div>
    );
  }

  _renderHeaderCell(rowIndex: number, columnIndex: number, style: any) {
    if (columnIndex < 1) {
      return;
    }
    const { onClickHeader } = this.props;

    return (
      <div className="cell headerCell" key={`headerCell ${columnIndex}`} onClick={(event) => onClickHeader ? onClickHeader(event) : null}
        style={style}>
        {/* {columnIndex} */}
        {utils.columnToLetter(columnIndex-1)}
      </div>
    );
  }

  render() {
    const {
      tableData,
      onMouseUp,
      onMouseDown,
      onMouseMove,
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
      while (rowData.length < MIN_COLUMNS) { // add columns to the display table
        rowData.push({
          content: '',
          rawContent: '',
          classNames: [],
          ...DEFAULT_CELL_STATE
        })
      }
    }

    while (tableData.length < MIN_ROWS) { // add rows to the display table
      const rowData = [];
      while (rowData.length < MIN_COLUMNS) {
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
      <ScrollSync>
        {({
          // clientHeight,
          // clientWidth,
          onScroll,
          // scrollHeight,
          scrollLeft,
          scrollTop,
          // scrollWidth,
        }) => {

          const rowHeight = 25;
          const columnWidth = 75;
          const height = 800;
          const rowCount = tableData.length;
          const columnCount = tableData[0].length;
          const overscanColumnCount = 2;
          const overscanRowCount = 5;

          return (
            <div className='GridRow'
              onMouseUp={(event) => (onMouseUp ? onMouseUp(event) : null)}
              onMouseDown={(event) => (onMouseDown ? onMouseDown(event) : null)}
              onMouseMove={(event) => (onMouseMove ? onMouseMove(event) : null)}
            >
              <div
                className="LeftSideGridContainer"
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0
                }}>
                <Grid
                  cellRenderer={data => {
                    return this._renderLeftHeaderCell(data.rowIndex, data.columnIndex, data.style)
                  }}
                  className="HeaderGrid"
                  width={columnWidth}
                  height={rowHeight}
                  rowHeight={rowHeight}
                  columnWidth={columnWidth}
                  rowCount={1}
                  columnCount={1}
                />
              </div>
              <div
                className="LeftSideGridContainer"
                style={{
                  position: 'absolute',
                  left: 0,
                  top: rowHeight
                }}>
                <Grid
                  overscanColumnCount={overscanColumnCount}
                  overscanRowCount={overscanRowCount}
                  cellRenderer={data => {
                    return this._renderLeftSideCell(data.rowIndex, data.columnIndex, data.style)
                  }}
                  columnWidth={columnWidth}
                  columnCount={1}
                  className='LeftSideGrid'
                  height={height - scrollbarSize()}
                  rowHeight={rowHeight}
                  rowCount={rowCount}
                  scrollTop={scrollTop}
                  width={columnWidth}
                />
              </div>
              <div className='GridColumn'>
                <AutoSizer disableHeight>
                  {({ width }) => (
                    <div>
                      <div
                        style={{
                          // backgroundColor: `rgb(${topBackgroundColor.r},${topBackgroundColor.g},${topBackgroundColor.b})`,
                          // color: topColor,
                          height: rowHeight,
                          width: width - scrollbarSize(),
                        }}
                      >
                        <Grid
                          className="HeaderGrid"
                          columnWidth={columnWidth}
                          columnCount={columnCount}
                          height={rowHeight}
                          overscanColumnCount={overscanColumnCount}
                          cellRenderer={data => {
                            return this._renderHeaderCell(data.rowIndex, data.columnIndex, data.style)
                          }}
                          rowHeight={rowHeight}
                          rowCount={1}
                          scrollLeft={scrollLeft}
                          width={width - scrollbarSize()}
                        />
                      </div>
                      <div
                        style={{
                          // backgroundColor: `rgb(${middleBackgroundColor.r},${middleBackgroundColor.g},${middleBackgroundColor.b})`,
                          // color: middleColor,
                          height,
                          width,
                        }}>
                        <Grid
                          className={wikiStore.table.selection && ableActivated ? 'BodyGrid active' : 'BodyGrid'}
                          columnWidth={columnWidth}
                          columnCount={columnCount}
                          height={height}
                          onScroll={onScroll}
                          overscanColumnCount={overscanColumnCount}
                          overscanRowCount={overscanRowCount}
                          cellRenderer={data => {
                            return this._renderBodyCell(tableData[data.rowIndex][data.columnIndex - 1], data.rowIndex, data.columnIndex - 1, data.style)
                          }}
                          rowHeight={rowHeight}
                          rowCount={rowCount}
                          width={width}
                        />
                      </div>
                    </div>
                  )}
                </AutoSizer>
              </div>
            </div>

          );
        }}
      </ScrollSync>
    )
  }
}

export default Table
