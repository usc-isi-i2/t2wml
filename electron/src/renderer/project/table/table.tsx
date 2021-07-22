import React from 'react';
import 'react-virtualized/styles.css'
import { AutoSizer, CellMeasurer, CellMeasurerCache, Grid, ScrollSync } from 'react-virtualized';
import scrollbarSize from 'dom-helpers/scrollbarSize';

import * as utils from './table-utils';
import { DEFAULT_CELL_STATE, TableCell, TableData } from '../../common/dtos';
import TableCellItem from './tableCellItem';
import './table-virtual.css'
import wikiStore from '@/renderer/data/store';
import { IReactionDisposer, reaction } from 'mobx';



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

interface TableState {
  overscanColumnCount: number;
  overscanRowCount: number;
  rowHeight: number;
  columnWidth: number;
  height: number;
}


class Table extends React.Component<TableProperties, TableState>{

  private disposers: IReactionDisposer[] = [];
  private cache: CellMeasurerCache;

  constructor(props: TableProperties) {
    super(props);

    this.state = {
      overscanColumnCount: 2,
      overscanRowCount: 5,
      rowHeight: 25,
      columnWidth: 75,
      height: 800,
    }

    this.cache = new CellMeasurerCache({
      defaultWidth: 100,
      minWidth: 75,
      fixedHeight: true
    });
  }

  // componentDidMount() {
  //   // this.disposers.push(reaction(() => wikiStore.table.showQnodes, () => this.updateShowQNodes()));
  // }

  // componentWillUnmount() {
  //   for (const disposer of this.disposers) {
  //     disposer();
  //   }
  // }

  // updateShowQNodes() {
  //   if (wikiStore.table.showQnodes) {
  //     this.setState({ rowHeight: 75, columnWidth: 100 })
  //   } else{
  //     this.setState({ rowHeight: 25, columnWidth: 75 })
  //   }

  // }

  _renderBodyCell(data: TableCell, rowIndex: number, columnIndex: number, style: any, parent: any) {
    if (!data) {
      return;
    }
    // const rowClass = this.getRowClass(rowIndex, columnIndex)
    // const classNames = rowClass + " " + "cell";

    return (
      <CellMeasurer
        cache={this.cache}
        columnIndex={columnIndex}
        key={`${rowIndex} ${columnIndex}`}
        parent={parent}
        rowIndex={rowIndex}
      >

        <div className="cell" key={`${rowIndex} ${columnIndex}`} style={style}>
          {/* {rowIndex} {columnIndex} */}
          <TableCellItem cellData={data} rowIndex={rowIndex} columnIndex={columnIndex} />
        </div>
      </CellMeasurer>

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
        {utils.columnToLetter(columnIndex - 1)}
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

    const {
      rowHeight, columnWidth, height, overscanColumnCount, overscanRowCount
    } = this.state;

    const rowCount = tableData.length;
    const columnCount = tableData[0].length;

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
                          // columnWidth={columnWidth}
                          columnCount={columnCount}
                          height={height}
                          onScroll={onScroll}
                          overscanColumnCount={overscanColumnCount}
                          overscanRowCount={overscanRowCount}
                          cellRenderer={data => {
                            return this._renderBodyCell(tableData[data.rowIndex][data.columnIndex - 1], data.rowIndex, data.columnIndex - 1, data.style, data.parent)
                          }}
                          rowHeight={() => wikiStore.table.showQnodes ? 70 : rowHeight}
                          rowCount={rowCount}
                          width={width}

                          columnWidth={this.cache.columnWidth}
                          deferredMeasurementCache={this.cache}
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
