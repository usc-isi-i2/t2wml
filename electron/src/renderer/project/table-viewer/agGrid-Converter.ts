import { TableDTO } from '../../common/dtos'
import {getColumnTitleFromIndex} from '../../common/utils'


export function getColumns(table:TableDTO){
    debugger
    const [numRows, numCols] = table.dims
    const agGridColumns=[]
    agGridColumns.push( { "headerName": "", "field": "^", "pinned": "left", "width": 40 })
    for (let i = 0; i < numCols; i++) {
        const colName = getColumnTitleFromIndex(i)
        agGridColumns.push({ "headerName": colName, "field": colName })
    }
    console.log("agGridColums", agGridColumns)
    return agGridColumns
}

export function getRowData(table:TableDTO){
    debugger
    const agGridRows=[]
    for (const [rowIndex, row] of table.cells.entries()) 
    {
        debugger
        const rowData:{ [key: string]: string} = {}
        rowData["^"]=(rowIndex+table.firstRowIndex).toString()

        for (const [colIndex, colContent] of row.entries()) {
        rowData[getColumnTitleFromIndex(colIndex)] =  colContent
        }

        agGridRows.push(rowData)
    }
    return agGridRows
}

function getDefaultGrid(numCols: number, numRows: number): TableDTO{
    const cells=[]
    for (let i = 0; i < numRows; ++i){
        let a = new Array(numCols); for (let j=0; j<numCols; ++j) a[j] = "";
        cells.push(a)
    }
    
    const table = {
        cells: cells,
        dims: [numCols, numRows],
        firstRowIndex: 0
    }
    return table;

}

const defaultGrid:TableDTO = getDefaultGrid(52, 100)