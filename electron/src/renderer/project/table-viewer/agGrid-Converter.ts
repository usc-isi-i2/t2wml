import { TableDTO } from '../../common/dtos';
import {getColumnTitleFromIndex} from '../../common/utils';


export function getColumns(table: TableDTO) {
  const [numCols] = table.dims;
  const agGridColumns = [];
  agGridColumns.push({
    "headerName": "",
    "field": "^",
    "pinned": "left",
    "width": 40,
  });
  for ( let i = 0; i < numCols; i++ ) {
    const colName = getColumnTitleFromIndex(i);
    agGridColumns.push({
      "headerName": colName,
      "field": colName,
    });
  }
  return agGridColumns;
}


export function getRowData(table: TableDTO) {
  const agGridRows = [];
  for ( const [rowIndex, row] of table.cells.entries() ) {
    const rowData: { [key: string]: string } = {};
    rowData["^"] = (rowIndex+1+table.firstRowIndex).toString();
    for ( const [colIndex, colContent] of row.entries() ) {
      rowData[getColumnTitleFromIndex(colIndex)] = colContent;
    }
    agGridRows.push(rowData);
  }
  return agGridRows;
}
