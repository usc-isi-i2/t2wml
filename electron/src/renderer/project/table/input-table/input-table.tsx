import React, { Component, Fragment } from 'react';
import { observer } from 'mobx-react';
import Table from '../table';


interface TableState {
  tableData: TableCell[][] | undefined;
  selectedCell: Cell | null;
  clipboardData: string | '',
}


@observer
class InputTable extends Component<{}, TableState> {

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
      clipboardData: '',
    };

    this.handleOnKeyDown = this.handleOnKeyDown.bind(this);
    this.getClipboardData = this.getClipboardData.bind(this);
  }

  componentDidMount() {
    document.addEventListener('paste', this.getClipboardData);
    document.addEventListener('keydown', this.handleOnKeyDown);
  }

  componentWillUnmount() {
    document.removeEventListener('paste', this.getClipboardData);
    document.removeEventListener('keydown', this.handleOnKeyDown);
  }

  getElementStyles(element) {
    const styles = {};

    for ( let i = 0; i < element.style.length; i++ ) {
      styles[element.style[i]] = element.style[element.style[i]];
    }

    return styles;
  }

  getClipboardData(event) {
    const data = (event.clipboardData || window.clipboardData).getData('text/html');
    if ( !data ) { return; }

    // Initialize an empty table data array
    const tableData = [];

    // Parse our copy-pasted html
    const parser = new DOMParser();
    const doc = parser.parseFromString(data, 'text/html');

    // Fill in the table data with
    const rows = doc.querySelectorAll('tr');
    rows.forEach((row: any, rowIndex: number) => {
      tableData.push([]);
      for ( let colIndex = 0; colIndex < row.children.length; colIndex++ ) {
        const td = row.children[colIndex];
        const content = (
          <span dangerouslySetInnerHTML={{ __html: td.innerHTML }} />
        )
        const style = this.getElementStyles(td);
        if ( rowIndex === 0 ) {
          style['width'] = '100%';
        }
        style['max-width'] = '1%';
        const cell: TableCell = {
          style,
          content,
          classNames: [],
        };
        tableData[rowIndex].push(cell);
      }
    });

    this.setState({ tableData });
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
    this.resetSelections();

    // Find the table cell element
    let counter = 0;
    let maxDepth = 3;
    let element = event.target as any;
    while (element.nodeName !== 'TD') {
      if ( counter >= maxDepth ) { return; }
      element = element.parentNode;
      counter += 1;
    }

    const x1: number = element.cellIndex;
    const y1: number = element.parentElement.rowIndex;

    // Activate the element on click
    this.selectCell(element);

    // Activate related cells
    const selectedCell = new Cell(x1 - 1, y1 - 1);
    this.setState({ selectedCell });
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
    if (!selectedCell) { return; }

    if ([37, 38, 39, 40].includes(event.keyCode)) {
      event.preventDefault();

      const table: any = this.tableRef;
      const rows = table!.querySelectorAll('tr');
      let { row, col } = selectedCell;

      // arrow up
      if (event.keyCode == 38) {
        row = row - 1;
        if (row < 0) { return; }
      }

      // arrow down
      if (event.keyCode == 40) {
        row = row + 1;
        if (row >= rows.length - 1) { return; }
      }

      // arrow left
      if (event.keyCode == 37) {
        col = col - 1;
        if (col < 0) { return; }
      }

      // arrow right
      if (event.keyCode == 39) {
        col = col + 1;
        if (col >= rows[row].children.length - 1) { return; }
      }

      this.resetSelections();

      // Activate the element on click
      const nextElement = rows[row + 1].children[col + 1];
      this.selectCell(nextElement);

      // Activate related cells
      const newSelectedCell = new Cell(col, row);
      this.setState({ selectedCell: newSelectedCell });
    }
  }

  renderTable() {
    const { clipboardData } = this.state;
    if ( clipboardData ) {
      return (
        <div className="table-wrapper"
          dangerouslySetInnerHTML={{ __html: clipboardData }} />
      )
    }
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
      </Fragment>
    )
  }
}


export default InputTable;
