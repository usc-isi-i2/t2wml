import React from 'react';
import * as utils from './table-utils';
import { TableData } from '../../common/dtos';
import { OverlayTrigger, Tooltip } from 'react-bootstrap';
import { Column, Table as VirtualizedTable, TableCellDataGetterParams, TableCellProps } from 'react-virtualized/dist/commonjs/Table';
import { AutoSizer } from 'react-virtualized/dist/es/AutoSizer';
import TableCellItem from './tableCellItem';


const MIN_NUM_ROWS = 100;
const CHARACTERS = [...Array(26)].map((a, i) => String.fromCharCode(97 + i).toUpperCase());


interface TableProperties {
  tableData?: TableData;
  onMouseUp?: (event: React.MouseEvent) => void;
  onMouseDown?: (event: React.MouseEvent) => void;
  onMouseMove?: (event: React.MouseEvent) => void;
  onClickHeader?: (event: React.MouseEvent) => void;
  setTableReference: any;
  optionalClassNames?: string;
  minCols?: number;
}


class Table extends React.Component<TableProperties>{

  constructor(props: TableProperties) {
    super(props);
  }

  renderEmptyTable() {
    const {
      onMouseUp,
      onMouseDown,
      onMouseMove,
      setTableReference,
      optionalClassNames,
      minCols
    } = this.props;
    let minimumColumns = 26;
    if (minCols) {
      minimumColumns = minCols
    }
    return (
      <div className={`table-wrapper ${optionalClassNames ? optionalClassNames : ''}`}>
        <table ref={setTableReference}
          onMouseUp={(event) => (onMouseUp ? onMouseUp(event) : null)}
          onMouseDown={(event) => (onMouseDown ? onMouseDown(event) : null)}
          onMouseMove={(event) => (onMouseMove ? onMouseMove(event) : null)}>
          <thead>
            <tr>
              <th></th>
              {CHARACTERS.slice(0, minimumColumns).map(c => <th key={c}><div>{c}</div></th>)}
            </tr>
          </thead>
          <tbody>
            {[...Array(MIN_NUM_ROWS)].map((e, i) => (
              <tr key={`row-${i}`}>
                <td>{i + 1}</td>
                {CHARACTERS.slice(0, minimumColumns).map((c, j) => (
                  <td key={`cell-${j}`}></td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  render() {
    const {
      tableData,
      onMouseUp,
      onMouseDown,
      onMouseMove,
      onClickHeader,
      setTableReference,
      optionalClassNames,
      minCols
    } = this.props;

    let minimumColumns = 26;
    if (minCols) {
      minimumColumns = minCols
    }

    if (!tableData) {
      return this.renderEmptyTable();
    }

    console.log("tableData", tableData)

    const rows = [...Array(Math.max(tableData.length, MIN_NUM_ROWS))];
    const cols = [...Array(Math.max(tableData[0] ? tableData[0].length : 0, minimumColumns))];

    return (
      <div className={`table-wrapper ${optionalClassNames ? optionalClassNames : ''}`}>
        <AutoSizer>
          {
            (Size: { height: number, width: number }) => (
              <VirtualizedTable
                height={Size.height} width={Size.width}
                headerHeight={20}
                rowHeight={30}
                rowCount={Object.keys(tableData).length}
                rowGetter={({ index }) => {
                  console.log(index, tableData[index])
                  return Object.entries(tableData[index])
                }
                }>

                <Column
                  label=''
                  dataKey=''
                  headerRenderer={() => <div>&nbsp;</div>}
                  width={50}
                  cellDataGetter={data => {
                    console.log("Column index-data.rowData", data.rowData, data.dataKey, data.rowData[data.dataKey])
                    return data.rowData[data.dataKey]
                  }}
                  cellRenderer={data => {
                    console.log("cellRenderer", data)
                    return <div>{data.rowIndex + 1} {data.cellData}</div>
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
                      // console.log("cellDataGetter", data, data.rowData[data.dataKey])
                      return data.rowData[data.dataKey]
                    }}
                    cellRenderer={(data: TableCellProps) => {
                      console.log('cellRenderer', data)
                      return (
                        <TableCellItem cellData={data.cellData} rowIndex={data.rowIndex} columnIndex={data.columnData} />
                      )
                    }}
                  />
                ))}

              </VirtualizedTable>
            )}
        </AutoSizer>

        {
        /* <table ref={setTableReference}
          onMouseUp={(event) => (onMouseUp ? onMouseUp(event) : null)}
          onMouseDown={(event) => (onMouseDown ? onMouseDown(event) : null)}
          onMouseMove={(event) => (onMouseMove ? onMouseMove(event) : null)}>
          <thead>
            <tr>
              <th></th>
              {cols.map((r, i) => (
                <th key={i}>
                  <div onDoubleClick={(event) => (onClickHeader ? onClickHeader(event) : null)}>
                    {utils.columnToLetter(i + 1)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((e, i) => (
              <tr key={`row-${i}`}>
                <td>{i + 1}</td>
                {cols.map((r, j) => {
                  if (i < tableData.length && j < tableData[i].length && tableData[i][j]) {
                    const { rawContent, content, classNames, overlay } = tableData[i][j];
                    if (overlay) {
                      return (
                        <OverlayTrigger
                          placement="right"
                          delay={{ show: 50, hide: 200 }}
                          overlay={(props) => (
                            <Tooltip id="button-tooltip" {...props} >
                              {overlay}
                            </Tooltip>
                          )}
                        >
                          <td key={`cell-${j}`} title={rawContent}
                            className={classNames ? classNames.join(' ') : ''}>
                            {content}

                          </td>
                        </OverlayTrigger>
                      )
                    }
                    else return (<td key={`cell-${j}`} title={rawContent}
                      className={classNames ? classNames.join(' ') : ''}>
                      {content}
                    </td>)
                  } else {
                    return <td key={`cell-${j}`} />
                  }
                })}
              </tr>
            ))}
          </tbody>
        </table>
       */}
      </div >
    )
  }
}


export default Table
