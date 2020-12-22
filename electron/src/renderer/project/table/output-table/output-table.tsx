//fills in tabledata and the mouse events, renders a "table" with those properties

//replace this with table-wrapper and the individual output-table and annotation-table components

import React, { Component, Fragment } from 'react';
import { observer } from 'mobx-react';
import { IReactionDisposer, reaction } from 'mobx';
import Table from '../table';
import wikiStore from '../../../data/store';
import { Cell, ErrorMessage } from '../../../common/general';
import { QNode, TableCell, TableDTO } from '../../../common/dtos';
import TableToast from '../table-toast';


interface TableState {
  tableData: TableCell[][] | undefined;
  selectedCell: Cell | null;
  showToast: boolean;
}


@observer
class OutputTable extends Component<{}, TableState> {
  private tableRef = React.createRef<HTMLTableElement>().current!;
  setTableReference(reference?: HTMLTableElement) {
    if (!reference) { return; }
    this.tableRef = reference;
  }

  constructor(props: {}) {
    super(props);

    // init state
    this.state = {
      tableData: undefined,
      selectedCell: new Cell(),
      showToast: false,
    };
  }

  private disposers: IReactionDisposer[] = [];

  componentDidMount() {
    this.updateTableData(wikiStore.table.table);
    document.addEventListener('keydown', (event) => this.handleOnKeyDown(event));
    this.disposers.push(reaction(() => wikiStore.table.table, (table) => this.updateTableData(table)));
  }

  componentWillUnmount() {
    document.removeEventListener('keydown', (event) => this.handleOnKeyDown(event));
    for (const disposer of this.disposers) {
      disposer();
    }
  }

  colorCellsByType(tableData?: TableCell[][]) {
    if (!tableData) {
      const { tableData } = this.state;
    }

    const types = wikiStore.layers.type;

    if (types && tableData) {
      for (const entry of types.entries) {
        for (const indexPair of entry.indices) {
          const tableCell = tableData[indexPair[0]][indexPair[1]];
          tableCell.classNames.push(`role-${entry.type}`)
        }
      }
    }

    this.setState({ tableData: tableData });
  }

  updateTableData(table?: TableDTO) {
    if (!table || !table.cells) {
      this.setState({ tableData: undefined });
      return;
    }
    const tableData = [];
    for (let i = 0; i < table.cells.length; i++) {
      const rowData = [];
      for (let j = 0; j < table.cells[i].length; j++) {
        const cell: TableCell = {
          content: table.cells[i][j],
          classNames: [],
        };
        rowData.push(cell);
      }
      tableData.push(rowData);
    }
    this.colorCellsByType(tableData)
  }

  selectCell(cell: Element, classNames: string[] = []) {
    // Activate the current cell
    cell.classList.add('active');
    classNames.map(className => cell.classList.add(className));

    // Add a top border to the cells at the top of the selection
    {
      const borderTop = document.createElement('div');
      borderTop.classList.add('cell-border-top');
      cell.appendChild(borderTop);
    }

    // Add a left border to the cells on the left of the selection
    {
      const borderLeft = document.createElement('div');
      borderLeft.classList.add('cell-border-left');
      cell.appendChild(borderLeft);
    }

    // Add a right border to the cells on the right of the selection
    {
      const borderRight = document.createElement('div');
      borderRight.classList.add('cell-border-right');
      cell.appendChild(borderRight);
    }

    // Add a bottom border to the cells at the bottom of the selection
    {
      const borderBottom = document.createElement('div');
      borderBottom.classList.add('cell-border-bottom');
      cell.appendChild(borderBottom);
    }
  }

  selectRelatedCells(row: number, col: number) {
    const selectedCell = new Cell(col - 1, row - 1);

    this.setState({ selectedCell, showToast: true });

    // Update selected cell in the data store
    wikiStore.table.selectedCell = selectedCell;

    const statement = wikiStore.layers.statement.find(selectedCell);
    if (!statement || !statement.cells) { return; }

    // Get a reference to the table elements
    const table: any = this.tableRef;
    const rows = table!.querySelectorAll('tr');

    // Select qualifier cells
    if ('qualifiers' in statement.cells) {
      statement.cells.qualifiers.forEach((cell: any) => {
        if (cell.qualifier) {
          const y = cell.qualifier[0];
          const x = cell.qualifier[1];
          const tableCell = rows[y + 1].children[x + 1];
          this.selectCell(tableCell, []);
        }
      });
    }

    // Select the cell with the main-subject
    if ('mainSubject' in statement.cells) {
      const y = statement.cells.subject[0];
      const x = statement.cells.subject[1];
      const cell = rows[y + 1].children[x + 1];
      this.selectCell(cell, []);
    }

    // Select the cell with the property
    if ('property' in statement.cells) {
      const y = statement.cells.property[0];
      const x = statement.cells.property[1];
      const cell = rows[y + 1].children[x + 1];
      this.selectCell(cell, []);
    }
  }

  resetSelections() {
    const table = this.tableRef;
    if (table) {
      table.querySelectorAll('td[class*="active"]').forEach(e => {
        e.classList.forEach(className => {
          if (className.startsWith('active')) {
            e.classList.remove(className);
          }
        });
      });
      table.querySelectorAll('.cell-border-top').forEach(e => e.remove());
      table.querySelectorAll('.cell-border-left').forEach(e => e.remove());
      table.querySelectorAll('.cell-border-right').forEach(e => e.remove());
      table.querySelectorAll('.cell-border-bottom').forEach(e => e.remove());
      table.querySelectorAll('.cell-resize-corner').forEach(e => e.remove());
    }
  }

  handleOnMouseUp(event: React.MouseEvent) {

  }

  handleOnMouseDown(event: React.MouseEvent) {
    this.resetSelections()
    const element = event.target as any;
    const x1: number = element.cellIndex;
    const x2: number = element.cellIndex;
    const y1: number = element.parentElement.rowIndex;
    const y2: number = element.parentElement.rowIndex;
    this.selectCell(element);

    // Activate the element on click
    this.selectRelatedCells(y1, x1);
  }

  handleOnMouseMove(event: React.MouseEvent) {

  }

  handleOnClickHeader(event: React.MouseEvent) {
    const element = event.target as any;
    element.setAttribute('style', 'width: 100%;');
    element.parentElement.setAttribute('style', 'max-width: 1%');

    const table: any = this.tableRef;
    const rows = table!.querySelectorAll('tr');
    const index = element.parentElement.cellIndex;
    rows.forEach((row: any) => {
      row.children[index].setAttribute('style', 'max-width: 1%');
    });

    setTimeout(() => {
      element.setAttribute('style', `min-width: ${element.clientWidth}px`);
    }, 100);
  }

  handleOnKeyDown(event: KeyboardEvent) {

    // Show the updated selection while moving
    // TODO
    //this.setState({showToast: true});

    if ([37, 38, 39, 40].includes(event.keyCode)) {
      const table: any = this.tableRef;
      const rows = table!.querySelectorAll('tr');

      event.preventDefault();
      let X = this.state.selectedCell.col
      let Y = this.state.selectedCell.row


      // arrow up
      if (event.keyCode == 38) {
        Y = Y - 1;
      }

      // arrow down
      if (event.keyCode == 40) {
        Y = Y = 1
      }

      // arrow left
      if (event.keyCode == 37) {
        X = X - 1
      }

      // arrow right
      if (event.keyCode == 39) {
        X = X + 1
      }

      if (X >= 0 && Y >= 0) { //TODO: Also add max
        const nextElement = rows[Y].children[X];
        this.selectCell(nextElement);
        this.selectRelatedCells(Y, X);
      }
    }
  }

  onCloseToast() {
    this.setState({ showToast: false });
  }

  renderToast() {
    const { selectedCell, showToast } = this.state;
    if (showToast) {
      const qnode = wikiStore.layers.qnode.find(selectedCell);
      return (
        <TableToast
          qnode={qnode as QNode}
          onClose={() => this.onCloseToast()}
        />
      )
    }
  }

  render() {
    return <Fragment>
      {this.renderToast()}

      <Table
        tableData={this.state.tableData}
        onMouseUp={this.handleOnMouseUp.bind(this)}
        onMouseDown={this.handleOnMouseDown.bind(this)}
        onMouseMove={this.handleOnMouseMove.bind(this)}
        onClickHeader={this.handleOnClickHeader.bind(this)}
        setTableReference={this.setTableReference.bind(this)} />
    </Fragment>
  }
}


export default OutputTable;
