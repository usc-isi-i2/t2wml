import React from 'react';
import 'react-virtualized/styles.css'
import { Column, Table as VirtualizedTable, TableCellDataGetterParams, TableCellProps } from 'react-virtualized/dist/commonjs/Table';

import * as utils from './table-utils';
import { TableCell, TableData, TableDTO } from '../../common/dtos';
import TableCellItem from './tableCellItem';
import './table-virtual.css'
import wikiStore from '@/renderer/data/store';
import { AutoSizer } from 'react-virtualized';
import { IReactionDisposer, reaction } from 'mobx';
import Draggable from 'react-draggable';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGripLinesVertical } from '@fortawesome/free-solid-svg-icons'

export const DEFAULT_CELL_STATE = {
  active: false,
  activeTop: false,
  activeLeft: false,
  activeRight: false,
  activeBottom: false,
  activeCorner: false,
  highlight: false,
  qnode: false
}

interface TableProperties {
  tableData: TableData;
  ableActivated?: boolean;
  onMouseUp?: (event: React.MouseEvent) => void;
  onMouseDown?: (event: React.MouseEvent) => void;
  onMouseMove?: (event: React.MouseEvent) => void;
  MIN_ROWS: number;
  MIN_COLUMNS: number;

  rowCount: number;
  rowGetter: (index: number) => TableCell[];
}


class Table extends React.Component<TableProperties, {
  rowHeight: number,
  columnWidth: number,
  activeTable: boolean,
  showQnode?: boolean,
  widthsDict: { [indexCol: number]: number } // dictionary of the indexes of the columns and their width fraction 
}
>{

  private tableRef: any;
  private disposers: IReactionDisposer[] = [];

  constructor(props: TableProperties) {
    super(props);

    const widthsDict: { [indexCol: number]: number } = {};
    const numColumns = this.props.tableData[0].length;
    const widthCol = 1 / numColumns;
    for (let indexCol = 0; indexCol < numColumns; indexCol++) {
      widthsDict[indexCol] = widthCol;
    }

    this.state = {
      rowHeight: 25,
      columnWidth: 75,
      activeTable: false,

      widthsDict: widthsDict
    }

    this.tableRef = null;
  }

  componentDidMount() {
    this.disposers.push(reaction(() => wikiStore.table.showQnodes, () => this.updateShowQNodes()));
    this.disposers.push(reaction(() => wikiStore.table.table, (table) => { this.scrolToTop(); this.resetTableWidthDict(table) }));
    this.disposers.push(reaction(() => wikiStore.table.selection, (selection) => this.setState({ activeTable: selection.selectionArea ? true : false })));
  }

  componentWillUnmount() {
    for (const disposer of this.disposers) {
      disposer();
    }
  }

  scrolToTop() {
    this.tableRef.scrollToPosition(0);
    wikiStore.table.currentRowIndex = 0;
  }

  resetTableWidthDict(table: TableDTO) {
    console.log("resetTableWidthDict")
    const widthsDict: { [indexCol: number]: number } = {};
    const numColumns = Math.max(table.cells[0].length, 26)
    const widthCol = 1 / numColumns;
    for (let indexCol = 0; indexCol < numColumns; indexCol++) {
      widthsDict[indexCol] = widthCol;
    }
    this.setState({ widthsDict })
  }

  updateShowQNodes() {
    if (this.props.ableActivated) {
      if (wikiStore.table.showQnodes) {
        this.setState({ rowHeight: 55, columnWidth: 100, showQnode: true }, () => {
          this.tableRef.recomputeRowHeights();
          this.tableRef.forceUpdateGrid();
        })
      } else {
        this.setState({ rowHeight: 25, columnWidth: 75, showQnode: false }, () => {
          this.tableRef.recomputeRowHeights();
          this.tableRef.forceUpdateGrid();
        })
      }
    }
  }

  setTableReference(reference: VirtualizedTable | null) {
    if (!reference) { return; }
    this.tableRef = reference;
  }

  resizeRow(indexCol: number, deltaX: number, tableWidth: number) {
    const { widthsDict } = this.state;

    const nextIndexCol = indexCol + 1;
    const percentDelta = deltaX / tableWidth;

    if ((widthsDict[indexCol] + percentDelta)*tableWidth < 50 || (widthsDict[indexCol] + percentDelta)*tableWidth > 300) {
      return;
    }

    const newwidthsDict = {
      ...widthsDict,
      [indexCol]: widthsDict[indexCol] + percentDelta,
      [nextIndexCol]: widthsDict[nextIndexCol] - percentDelta
    }
    this.setState({ widthsDict: newwidthsDict }, () => {
      // this.tableRef.forceUpdateGrid();
    })
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
      ableActivated,
      rowCount
    } = this.props;

    const { rowHeight, columnWidth, showQnode, widthsDict } = this.state;
    const tableWidth = tableData[0].length * columnWidth;
    return (
      <div
        className='table-wrapper'
        onMouseUp={(event) => (onMouseUp ? onMouseUp(event) : null)}
        onMouseDown={(event) => (onMouseDown ? onMouseDown(event) : null)}
        onMouseMove={(event) => (onMouseMove ? onMouseMove(event) : null)}
        key={showQnode ? "showQnode" : "not showQnode"}
      >
        <AutoSizer disableWidth>
          {
            (Size: { height: number }) => {
              return (
                <VirtualizedTable id="virtualized-table"
                  height={Size.height}
                  width={tableWidth + 50}
                  className={this.state.activeTable && ableActivated ? 'active' : ''}
                  headerHeight={rowHeight}
                  rowHeight={rowHeight}
                  ref={(ref: VirtualizedTable | null) => this.setTableReference(ref)}
                  rowCount={rowCount}
                  rowGetter={({ index }) => this.rowGetter(index)}
                // showQnode={showQnode}
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
                          <React.Fragment key={data.dataKey}>
                            <div className="ReactVirtualized__Table__headerTruncatedText">
                              {data.label}
                            </div>
                            <Draggable
                              axis="x"
                              defaultClassName="DragHandle"
                              defaultClassNameDragging="DragHandleActive"
                              onDrag={(_event, { deltaX }) => this.resizeRow(i, deltaX, tableWidth)}
                            >
                              <span className="DragHandleIcon"><FontAwesomeIcon icon={faGripLinesVertical} size="lg" /></span>
                            </Draggable>
                          </React.Fragment>
                        )
                      }}
                      // width={widthsDict[i.toString()] || columnWidth}
                      width={widthsDict[i] * tableWidth}
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
