import React from 'react';
import * as utils from './table-utils';
import { TableData } from '../../common/dtos';
import { OverlayTrigger, Tooltip } from 'react-bootstrap';


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

    const rows = [...Array(Math.max(tableData.length, MIN_NUM_ROWS))];
    const cols = [...Array(Math.max(tableData[0] ? tableData[0].length : 0, minimumColumns))];

    return (
      <div className={`table-wrapper ${optionalClassNames ? optionalClassNames : ''}`}>
        <table ref={setTableReference}
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
      </div>
    )
  }
}


export default Table
