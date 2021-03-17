import React, { Component, Fragment } from 'react';
import { observer } from 'mobx-react';
import { IReactionDisposer, reaction } from 'mobx';
import Table from '../table';
import wikiStore, { Layer } from '../../../data/store';
import { Cell, CellSelection } from '../../../common/general';
import { AnnotationBlock, QNodeEntry, QNode, TableCell, TableData, TableDTO, TypeEntry } from '../../../common/dtos';
import WikifyMenu from './wikify-menu';
import { settings } from '../../../../main/settings';
import * as utils from '../table-utils';


interface TableState {
  tableData?: TableData;
  selectedCell?: Cell;
  showWikifyMenu: boolean;
  wikifyCellContent?: string;
  wikifyMenuPosition: Array<number>;
  selectedAnnotationBlock?: AnnotationBlock;
}


@observer
class WikifyTable extends Component<{}, TableState> {
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
      showWikifyMenu: false,
      wikifyCellContent: undefined,
      wikifyMenuPosition: [50, 70],
      selectedAnnotationBlock: undefined,
    };

    this.handleOnKeyDown = this.handleOnKeyDown.bind(this);
  }

  private disposers: IReactionDisposer[] = [];

  componentDidMount() {
    this.updateTableData(wikiStore.table.table);
    document.addEventListener('keydown', this.handleOnKeyDown);
    this.disposers.push(reaction(() => wikiStore.table.table, (table) => this.updateTableData(table)));
    this.disposers.push(reaction(() => wikiStore.layers.type, (types) => this.colorCellsByType(types)))
    this.disposers.push(reaction(() => wikiStore.layers.qnode, (qnodes) => this.updateQnodeCells(qnodes)));
    this.disposers.push(reaction(() => wikiStore.table.showCleanedData, () => this.toggleCleanedData()));
  }

  componentWillUnmount() {
    document.removeEventListener('keydown', this.handleOnKeyDown);
    for (const disposer of this.disposers) {
      disposer();
    }
  }

  getCellContent(qnode: QNode, rawContent?: string) {
    return (
      <span>
        {rawContent}
        <br />
        <strong>{qnode.label}</strong> ({qnode.url ? (
          <a target="_blank"
            rel="noopener noreferrer"
            className="type-qnode"
            href={qnode.url}>
            {qnode.id}
          </a>
        ) : (
          <span>{qnode.id}</span>
        )})
        <br />
        {qnode.description}
      </span>
    );
  }

  updateTableData(table?: TableDTO) {
    if (!table || !table.cells) {
      this.setState({ tableData: undefined });
      return;
    }
    const tableData = [];
    for (let i = 0; i < table.cells.length; i++) {
      const rowData: TableCell[] = [];
      for (let j = 0; j < table.cells[i].length; j++) {
        const rawContent: string = table.cells[i][j];
        const cell: TableCell = {
          classNames: [],
          content: rawContent,
          rawContent,
        };
        rowData.push(cell);
      }
      tableData.push(rowData);
    }
    this.setState({ tableData }, () => {
      this.colorCellsByType(wikiStore.layers.type);
      this.updateQnodeCells(wikiStore.layers.qnode);
    });
  }

  updateQnodeCells(qnodes: Layer<QNodeEntry>) {
    const { tableData } = this.state;
    if (!tableData) {
      return;
    }

    //clear any existing qnode coloration
    const table = this.tableRef;
    if (table) {
      table.querySelectorAll('td').forEach(e => {
        e.classList.forEach(className => {
          if (className.startsWith('type-qNode')) {
            e.classList.remove(className);
          }
        });
      });
    }

    for (const entry of qnodes.entries) {
      for (const indexPair of entry.indices) {
        const tableCell = tableData[indexPair[0]][indexPair[1]];
        tableCell.content = this.getCellContent(entry, tableCell.rawContent);
        tableCell.classNames.push('type-qNode');
      }
    }
    this.setState({ tableData });
  }

  colorCellsByType(types: Layer<TypeEntry>) {
    const { tableData } = this.state;
    if (!tableData) {
      return;
    }

    //clear any existing type coloration
    const table = this.tableRef;
    if (table) {
      table.querySelectorAll('td').forEach(e => {
        e.classList.forEach(className => {
          if (className.startsWith('role') || className.startsWith('status')) {
            e.classList.remove(className);
          }
        });
      });
    }


    for (const entry of types.entries) {
      for (const indexPair of entry.indices) {
        if (["majorError", "minorError"].includes(entry.type)){
          const tableCell = tableData[indexPair[0]][indexPair[1]];
          tableCell.classNames.push(`status-${entry.type}`)
        }else{
        const tableCell = tableData[indexPair[0]][indexPair[1]];
        tableCell.classNames.push(`role-${entry.type}`)
        }
      }
    }
    this.setState({ tableData });
  }

  toggleCleanedData() {
    const { tableData } = this.state;
    if (!tableData) {
      return;
    }

    const cleaned = wikiStore.layers.cleaned;

    //reset everything to raw
    for (let i = 0; i < tableData.length; i++) {
      for (let j = 0; j < tableData[0].length; j++) {
        tableData[i][j].content = wikiStore.table.table.cells[i][j]
      }
    }

    //replace cleaned entries if showCleanedData

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

  updateSelections(selectedBlock?: AnnotationBlock) {
    const { selectedCell } = this.state;
    if ( !selectedCell && !selectedBlock ) { return; }
    const table: any = this.tableRef;
    if ( !table ) { return; }

    // Reset selections before update
    this.resetSelection();
    table.classList.add('active');

    const classNames: string[] = ['active'];
    if ( selectedBlock ) {
      const { role } = selectedBlock;
      if ( role ) {
        const className = `role-${role}`;
        table.querySelectorAll(`td[class*="${className}"]`).forEach((element: HTMLElement) => {
          element.classList.remove(className);
        });
        classNames.push(className);
      }
    }

    const rows = table.querySelectorAll('tr');
    let x1, x2, y1, y2;
    if ( selectedBlock ) {
      x1 = selectedBlock.selection.x1;
      x2 = selectedBlock.selection.x2;
      y1 = selectedBlock.selection.y1;
      y2 = selectedBlock.selection.y2;
    } else {
      const { col, row } = selectedCell!;
      x1 = col + 1;
      x2 = col + 1;
      y1 = row + 1;
      y2 = row + 1;
    }
    const leftCol = Math.min(x1, x2);
    const rightCol = Math.max(x1, x2);
    const topRow = Math.min(y1, y2);
    const bottomRow = Math.max(y1, y2);
    let rowIndex = topRow;
    while ( rowIndex <= bottomRow ) {
      let colIndex = leftCol;
      while ( colIndex <= rightCol ) {
        this.selectCell(
          rows[rowIndex].children[colIndex],
          rowIndex,
          colIndex,
          topRow,
          leftCol,
          rightCol,
          bottomRow,
          classNames,
        );
        colIndex += 1;
      }
      rowIndex += 1;
    }
  }

  selectCell(cell: Element, rowIndex: number, colIndex: number, topRow: number, leftCol: number, rightCol: number, bottomRow: number, classNames: string[] = []) {
    // Activate the current cell
    cell.classList.add('active');
    classNames.map(className => cell.classList.add(className));

    // Add a top border to the cells at the top of the selection
    if (rowIndex === topRow) {
      const borderTop = document.createElement('div');
      borderTop.classList.add('cell-border-top');
      cell.appendChild(borderTop);
    }

    // Add a left border to the cells on the left of the selection
    if (colIndex === leftCol) {
      const borderLeft = document.createElement('div');
      borderLeft.classList.add('cell-border-left');
      cell.appendChild(borderLeft);
    }

    // Add a right border to the cells on the right of the selection
    if (colIndex === rightCol) {
      const borderRight = document.createElement('div');
      borderRight.classList.add('cell-border-right');
      cell.appendChild(borderRight);
    }

    // Add a bottom border to the cells at the bottom of the selection
    if (rowIndex === bottomRow) {
      const borderBottom = document.createElement('div');
      borderBottom.classList.add('cell-border-bottom');
      cell.appendChild(borderBottom);
    }
  }

  resetSelection() {
    const table = this.tableRef;
    if (table) {
      table.classList.remove('active');
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

  openWikifyMenu(event: React.MouseEvent, rawContent?: string) {
    let { pageX, pageY } = event;
    pageX = pageX - 250;
    if ( settings.window.height - pageY <= 275 ) {
      pageY -= 275;
    } else {
      pageY = pageY - 10;
    }
    this.setState({
      showWikifyMenu: true,
      wikifyCellContent: rawContent,
      wikifyMenuPosition: [pageX, pageY],
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
    const tableCell = tableData[row][col];

    // Only open the output menu if there's content
    if ( tableCell.content ) {
      this.openWikifyMenu(event, tableCell.rawContent);
    }
  }

  handleOnMouseDown(event: React.MouseEvent) {
    this.resetSelection();

    // Find the table cell element
    let counter = 0;
    const maxDepth = 3;
    let element = event.target as any;
    while (element.nodeName !== 'TD') {
      if ( counter >= maxDepth ) { return; }
      element = element.parentNode;
      counter += 1;
    }

    this.setState({
      showWikifyMenu: false,
    });

    const x1: number = element.cellIndex;
    const y1: number = element.parentElement.rowIndex;

    const selectedCell: Cell = new Cell(x1 - 1, y1 - 1);
    this.setState({ selectedCell }, () => {
      wikiStore.table.selectedCell = selectedCell;
      this.updateSelections();
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
    const { selectedCell } = this.state;
    if (!selectedCell) { return; }

    if (event.keyCode == 27) {
      this.closeWikifyMenu();
    }

    if ([37, 38, 39, 40].includes(event.keyCode)) {
      this.setState({ showWikifyMenu: true });

      // Don't allow moving around when users are typing
      if ( (event.target as any).nodeName === 'INPUT' ) { return; }

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

      this.resetSelection();
      const nextSelectedCell: Cell = new Cell(col, row);
      this.setState({ selectedCell: nextSelectedCell }, () => {
        wikiStore.table.selectedCell = selectedCell;
        this.updateSelections();
      });
    }
  }

  closeWikifyMenu() {
    this.setState({
      showWikifyMenu: false,
    });
  }

  handleOnSelectBlock(applyToBlock: boolean) {
    const { selectedCell } = this.state;
    if ( applyToBlock && selectedCell ) {
      const { col, row } = selectedCell;
      const selection: CellSelection = {
        x1: col + 1,
        x2: col + 1,
        y1: row + 1,
        y2: row + 1,
      };
      const selectedBlock = utils.checkSelectedAnnotationBlocks(selection);
      if ( selectedBlock ) {
        this.setState({ selectedAnnotationBlock: selectedBlock });
        this.updateSelections(selectedBlock);
      }
    } else {
      this.setState({ selectedAnnotationBlock: undefined }, () => {
        this.updateSelections();
      });
    }
  }

  renderWikifyMenu() {
    const {
      selectedCell,
      showWikifyMenu,
      wikifyCellContent,
      wikifyMenuPosition,
    } = this.state;
    if ( selectedCell && showWikifyMenu ) {
      return (
        <WikifyMenu
          selectedCell={selectedCell}
          onSelectBlock={this.handleOnSelectBlock.bind(this)}
          wikifyCellContent={wikifyCellContent}
          position={wikifyMenuPosition}
          onClose={() => this.closeWikifyMenu()} />
      )
    }
  }

  renderTable() {
    return (
      <Table
        optionalClassNames={'wikify-table'}
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
        {this.renderWikifyMenu()}
      </Fragment>
    )
  }
}


export default WikifyTable;
