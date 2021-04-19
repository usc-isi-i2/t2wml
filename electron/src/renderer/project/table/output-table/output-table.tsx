//fills in tabledata and the mouse events, renders a "table" with those properties

//replace this with table-wrapper and the individual output-table and annotation-table components

import React, { Component, Fragment } from 'react';
import { observer } from 'mobx-react';
import { IReactionDisposer, reaction } from 'mobx';
import Table from '../table';
import wikiStore from '../../../data/store';
import { Cell } from '../../../common/general';
import { TableCell, TableData, TableDTO } from '../../../common/dtos';
import OutputMenu from './output-menu';
import { settings } from '../../../../main/settings';


interface TableState {
  tableData?: TableData;
  selectedCell?: Cell;
  showOutputMenu: boolean;
  outputMenuPosition: Array<number>;
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
      selectedCell: undefined,
      showOutputMenu: false,
      outputMenuPosition: [50, 70],
    };

    this.handleOnKeyDown = this.handleOnKeyDown.bind(this);
  }

  private disposers: IReactionDisposer[] = [];

  componentDidMount() {
    this.updateTableData(wikiStore.table.table);
    document.addEventListener('keydown', this.handleOnKeyDown);
    this.disposers.push(reaction(() => wikiStore.table.table, (table) => this.updateTableData(table)));
    this.disposers.push(reaction(() => wikiStore.table.showCleanedData, () => this.toggleCleanedData()));
  }

  componentWillUnmount() {
    document.removeEventListener('keydown', this.handleOnKeyDown);
    for (const disposer of this.disposers) {
      disposer();
    }
  }

  updateTableData(table?: TableDTO) {
    if (!table || !table.cells) {
      this.setState({ tableData: undefined });
      return;
    }
    const tableData: TableData = [];
    for (let i = 0; i < table.cells.length; i++) {
      const rowData: TableCell[] = [];
      for (let j = 0; j < table.cells[i].length; j++) {
        const cell: TableCell = {
          content: table.cells[i][j],
          classNames: [],
        };
        rowData.push(cell);
      }
      tableData.push(rowData);
    }
    this.updateCells(tableData);
  }

  updateCells(tableData: TableData) {
    if (!tableData) { return; }

    const errors = wikiStore.layers.error;
    for (const entry of errors.entries) {
      for (const indexPair of entry.indices) {
        const tableCell = tableData[indexPair[0]][indexPair[1]];
        tableCell.classNames.push('error');
      }
    }

    const types = wikiStore.layers.type;
    for (const entry of types.entries) {
      for (const indexPair of entry.indices) {
        const tableCell = tableData[indexPair[0]][indexPair[1]];
        tableCell.classNames.push(`role-${entry.type}`);
      }
    }

    const qnodes = wikiStore.layers.qnode;
    if (!tableData) { return; }
    for (const entry of qnodes.entries) {
      for (const indexPair of entry.indices) {
        const tableCell = tableData[indexPair[0]][indexPair[1]];
        tableCell.classNames.push(`type-wikibaseitem`);
      }
    }

    this.setState({
      tableData,
      showOutputMenu: false,
      selectedCell: undefined,
    });
  }

  toggleCleanedData() {
    const { tableData } = this.state;
    if (!tableData) {
      return;
    }

    //reset everything to raw
    for (let i = 0; i < tableData.length; i++) {
      for (let j = 0; j < tableData[0].length; j++) {
        tableData[i][j].content = wikiStore.table.table.cells[i][j]
      }
    }

    //replace cleaned entries if showCleanedData
    const cleaned = wikiStore.layers.cleaned;
    if (wikiStore.table.showCleanedData) {
      for (const entry of cleaned.entries) {
        for (const indexPair of entry.indices) {
          const tableCell = tableData[indexPair[0]][indexPair[1]];
          tableCell.content = entry.cleaned;
        }
      }
    }

    this.setState({ tableData })
  }

  selectCell(cell: Element, classNames: string[] = []) {
    // Activate the current cell
    cell.classList.add('active');
    classNames.map(className => cell.classList.add(className));

    // Add a top border to the cells at the top of the selection
    const borderTop = document.createElement('div');
    borderTop.classList.add('cell-border-top');
    cell.appendChild(borderTop);

    // Add a left border to the cells on the left of the selection
    const borderLeft = document.createElement('div');
    borderLeft.classList.add('cell-border-left');
    cell.appendChild(borderLeft);

    // Add a right border to the cells on the right of the selection
    const borderRight = document.createElement('div');
    borderRight.classList.add('cell-border-right');
    cell.appendChild(borderRight);

    // Add a bottom border to the cells at the bottom of the selection
    const borderBottom = document.createElement('div');
    borderBottom.classList.add('cell-border-bottom');
    cell.appendChild(borderBottom);
  }

  selectRelatedCells(selectedCell: Cell) {
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
        for (const key in cell) {
          const y = cell[key][0];
          const x = cell[key][1];
          const tableCell = rows[y + 1].children[x + 1];
          this.selectCell(tableCell, []);
        }
      });
    }

    for (const key in statement.cells) {
      if (key === 'qualifiers') { continue; }
      const y = statement.cells[key][0];
      const x = statement.cells[key][1];
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

  openOutputMenu(event: React.MouseEvent) {
    let { pageX, pageY } = event;
    pageX = pageX - 300;
    if (settings.window.height - pageY <= 375) {
      pageY -= 375;
    } else {
      pageY = pageY - 100;
    }
    this.setState({
      showOutputMenu: true,
      outputMenuPosition: [pageX, pageY],
    });
  }

  handleOnMouseUp(event: React.MouseEvent) {
    const { selectedCell, tableData } = this.state;
    if (!selectedCell || !tableData) { return; }

    const { row, col } = selectedCell;
    if (row < 0 || row >= tableData.length || col < 0 || col >= tableData[row].length) {
      // There is no such cell, do nothing
      return;
    }

    // Only open the output menu if there's content
    if (tableData[row]) {
      if (tableData[row][col]) {
        const tableCell = tableData[row][col];
        if (tableCell.content) {
          this.openOutputMenu(event);
        }
      }
    }
  }

  handleOnMouseDown(event: React.MouseEvent) {
    this.resetSelections();
    const element = event.target as any;

    // Don't let users select header cells
    if (element.nodeName !== 'TD') { return; }

    this.setState({
      showOutputMenu: false,
    });

    const x1: number = element.cellIndex;
    const y1: number = element.parentElement.rowIndex;

    // Activate the element on click
    this.selectCell(element);

    // Activate related cells
    const selectedCell = new Cell(x1 - 1, y1 - 1);
    this.setState({ selectedCell }, () => {
      this.selectRelatedCells(selectedCell);
    });
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
    const { selectedCell, tableData } = this.state;
    if (!selectedCell || !tableData) { return; }

    // Hide the output menu with ESC key
    if (event.code === 'Escape') {
      this.setState({ showOutputMenu: false }, () => {
        this.resetSelections();
      });
    }

    const arrowCodes = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
    if (arrowCodes.includes(event.code)) {

      event.preventDefault();

      const table: any = this.tableRef;
      const rows = table!.querySelectorAll('tr');
      let { row, col } = selectedCell;

      // arrow up
      if (event.code === 'ArrowUp') {
        row = row - 1;
        if (row < 0) { return; }
      }

      // arrow down
      if (event.code === 'ArrowDown') {
        row = row + 1;
        if (row >= rows.length - 1) { return; }
      }

      // arrow left
      if (event.code === 'ArrowLeft') {
        col = col - 1;
        if (col < 0) { return; }
      }

      // arrow right
      if (event.code === 'ArrowRight') {
        col = col + 1;
        if (col >= rows[row].children.length - 1) { return; }
      }

      this.resetSelections();

      // Activate the element on click
      const nextElement = rows[row + 1].children[col + 1];
      this.selectCell(nextElement);

      // Activate related cells
      const newSelectedCell = new Cell(col, row);
      this.setState({ selectedCell: newSelectedCell }, () => {
        this.selectRelatedCells(newSelectedCell);

        // Only open the output menu if there's content
        if (tableData[row]) {
          if (tableData[row][col]) {
            const tableCell = tableData[row][col];
            if (tableCell.content) {
              this.setState({ showOutputMenu: !!tableCell.content });
            }
          }
        }

      });
    }
  }

  closeOutputMenu() {
    this.setState({
      showOutputMenu: false,
    });
  }

  renderOutputMenu() {
    const {
      selectedCell,
      showOutputMenu,
      outputMenuPosition,
    } = this.state;
    if (selectedCell && showOutputMenu) {
      return (
        <OutputMenu
          selectedCell={selectedCell}
          position={outputMenuPosition}
          onClose={() => this.closeOutputMenu()} />
      )
    }
  }

  renderTable() {
    return (
      <Table
        tableData={this.state.tableData}
        onMouseUp={this.handleOnMouseUp.bind(this)}
        onMouseDown={this.handleOnMouseDown.bind(this)}
        onMouseMove={() => void 0}
        onClickHeader={this.handleOnClickHeader.bind(this)}
        setTableReference={this.setTableReference.bind(this)} />
    )
  }

  render() {
    return (
      <Fragment>
        {this.renderTable()}
        {this.renderOutputMenu()}
      </Fragment>
    )
  }
}


export default OutputTable;
