import React from 'react';
import * as utils from './table-utils';
import { TableData } from '../../common/dtos';


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
    } = this.props;
    return (
      <div className={`table-wrapper ${optionalClassNames ? optionalClassNames : ''}`}>
        <table ref={setTableReference}
          onMouseUp={(event) => (onMouseUp ? onMouseUp(event) : null)}
          onMouseDown={(event) => (onMouseDown ? onMouseDown(event) : null)}
          onMouseMove={(event) => (onMouseMove ? onMouseMove(event) : null)}>
          <thead>
            <tr>
              <th></th>
              {CHARACTERS.map(c => <th key={c}><div>{c}</div></th>)}
            </tr>
          </thead>
          <tbody>
            {[...Array(MIN_NUM_ROWS)].map((e, i) => (
              <tr key={`row-${i}`}>
                <td>{i + 1}</td>
                {CHARACTERS.map((c, j) => (
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
    } = this.props;

    if (!tableData) {
      return this.renderEmptyTable();
    }

    const rows = [...Array(Math.max(tableData.length, MIN_NUM_ROWS))];
    const cols = [...Array(Math.max(tableData[0] ? tableData[0].length : 0, 26))];

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
                  if ( i < tableData.length && j < tableData[i].length && tableData[i][j] ) {
                    const { content, classNames } = tableData[i][j];
                    return (
                      <td key={`cell-${j}`}
                        className={classNames ? classNames.join(' ') : ''}>
                        {content}
                      </td>
                    )
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
