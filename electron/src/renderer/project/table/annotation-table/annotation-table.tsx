//fills in tabledata and the mouse events, renders a "table" with those properties

import React, { Component, Fragment } from 'react';
import { observer } from 'mobx-react';
import Table from '../table';
import { IReactionDisposer, reaction } from 'mobx';
import wikiStore from '@/renderer/data/store';
import { AnnotationBlock, TableCell, TableData, TableDTO } from '../../../common/dtos';
import { CellSelection } from '../../../common/general';
import AnnotationMenu from './annotation-menu';
import { settings } from '../../../../main/settings';


interface TableState {
  tableData?: TableData;
  showAnnotationMenu: boolean;
  annotationMenuPosition: Array<number>;
  selectedAnnotationBlock?: AnnotationBlock;
}


type Direction = 'up' | 'down' | 'left' | 'right';


@observer
class AnnotationTable extends Component<{}, TableState> {
  private tableRef = React.createRef<HTMLTableElement>().current!;
  private prevElement?: any; // We use any here, since the HTML element type hierarchy is too messy
  private prevDirection?: Direction;
  private selecting = false;
  private selection: CellSelection | undefined;

  setTableReference(reference?: HTMLTableElement) {
    if (!reference) { return; }
    this.tableRef = reference;
  }

  constructor(props: {}) {
    super(props);

    // init state
    this.state = {
      tableData: undefined,
      showAnnotationMenu: false,
      annotationMenuPosition: [50, 70],
      selectedAnnotationBlock: undefined,
    };

    this.handleOnKeyDown = this.handleOnKeyDown.bind(this);
    this.handleOnMouseUp = this.handleOnMouseUp.bind(this);
  }

  private disposers: IReactionDisposer[] = [];

  componentDidMount() {
    this.updateTableData(wikiStore.table.table);
    document.addEventListener('keydown', this.handleOnKeyDown);
    document.addEventListener('mouseup', this.handleOnMouseUp);

    this.disposers.push(reaction(() => wikiStore.table.table, (table) => this.updateTableData(table)));
    this.disposers.push(reaction(() => wikiStore.annotations.blocks, () => this.updateAnnotationBlocks()));
  }

  componentWillUnmount() {
    document.removeEventListener('keydown', this.handleOnKeyDown);
    document.removeEventListener('mouseup', this.handleOnMouseUp);
    for (const disposer of this.disposers) {
      disposer();
    }
  }

  updateTableData(table?: TableDTO) {
    if ( !table || !table.cells ) {
      this.setState({ tableData: undefined });
      return;
    }
    const tableData = [];
    for ( let i = 0; i < table.cells.length; i++ ) {
      const rowData = [];
      for ( let j = 0; j < table.cells[i].length; j++ ) {
        const cell: TableCell = {
          content: table.cells[i][j],
          classNames: [],
        };
        rowData.push(cell);
      }
      tableData.push(rowData);
    }
    this.updateAnnotationBlocks(tableData);
  }

  checkSelectedAnnotationBlocks(selection: CellSelection): AnnotationBlock | null {
    // checks if a given selection is part of an annotation block
    // if so, returns the annotation block
    const { x1, x2, y1, y2 } = selection;
    for (const block of wikiStore.annotations.blocks) {
      if (block.selection['y1'] <= block.selection['y2']) {
        if (block.selection['x1'] <= block.selection['x2']) {
          if (x1 >= block.selection['x1'] &&
            x2 <= block.selection['x2'] &&
            y1 >= block.selection['y1'] &&
            y2 <= block.selection['y2']) {
            return block;
          }
        } else {
          if (x1 <= block.selection['x1'] &&
            x2 >= block.selection['x2'] &&
            y1 >= block.selection['y1'] &&
            y2 <= block.selection['y2']) {
            return block;
          }
        }
      } else {
        if (block.selection['x1'] <= block.selection['x2']) {
          if (x1 >= block.selection['x1'] &&
            x2 <= block.selection['x2'] &&
            y1 <= block.selection['y1'] &&
            y2 >= block.selection['y2']) {
            return block;
          }
        } else {
          if (x1 <= block.selection['x1'] &&
            x2 >= block.selection['x2'] &&
            y1 <= block.selection['y1'] &&
            y2 >= block.selection['y2']) {
            return block;
          }
        }
      }
    }
    return null;
  }

  updateAnnotationBlocks(tableData?: TableData) {
    if ( !tableData ) {
      tableData = this.state.tableData;
    }

    function emptyTableCell(): TableCell {
      return {
        content: '',
        classNames: [],
      };
    }

    const table: any = this.tableRef;
    if ( !table ) { return; }

    if ( wikiStore.annotations.blocks && tableData ) {

      for ( const block of wikiStore.annotations.blocks ) {
        const { role, type, selection } = block;
        const classNames: string[] = [];
        if ( role ) {
          classNames.push(`role-${role}`);
        }
        if ( type ) {
          classNames.push(`type-${type}`);
        }
        const { x1, y1, x2, y2 } = selection;
        const rows = table.querySelectorAll('tr');
        const leftCol = Math.min(x1, x2);
        const rightCol = Math.max(x1, x2);
        const topRow = Math.min(y1, y2);
        const bottomRow = Math.max(y1, y2);
        let rowIndex = topRow;
        while ( rowIndex <= bottomRow ) {
          let colIndex = leftCol;
          const row = rows[rowIndex];
          while ( row && colIndex <= rightCol ) {
            this.selectCell(
              row.children[colIndex],
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
        for ( let row = topRow; row <= bottomRow; row++ ) {
          for ( let col = leftCol; col <= rightCol; col++ ) {
            try {
              const cell = tableData[row - 1][col - 1];
              cell.classNames = classNames;
            } catch {
              let rx = row;
              while ( rx > tableData.length ) {
                const emptyArray: TableCell[] = [...Array(col)].map(() => emptyTableCell());
                tableData.push(emptyArray);
                rx -= 1;
              }
              let cx = col;
              while ( cx > tableData[0].length ) {
                tableData.forEach(tableRow => tableRow.push(emptyTableCell()));
                cx -= 1;
              }
              const cell = tableData[row - 1][col - 1];
              cell.classNames = classNames;
            }
          }
        }
      }
    }
    this.setState({ tableData });
  }

  deleteAnnotationBlock(block: AnnotationBlock) {
    const { tableData } = this.state;
    if ( tableData ) {
      const { x1, y1, x2, y2 } = block.selection;
      if ( y1 <= y2 ) {
        if ( x1 <= x2 ) {
          for ( let row = y1 - 1; row < y2; row++ ) {
            for ( let col = x1 - 1; col < x2; col++ ) {
              const cell = tableData[row][col];
              if ( cell ) {
                cell.classNames = [];
              }
            }
          }
        } else {
          for ( let row = y1 - 1; row < y2; row++ ) {
            for ( let col = x2 - 1; col < x1; col++ ) {
              const cell = tableData[row][col];
              if ( cell ) {
                cell.classNames = [];
              }
            }
          }
        }
      } else {
        if ( x1 <= x2 ) {
          for ( let row = y2 - 1; row < y1; row++ ) {
            for ( let col = x1 - 1; col < x2; col++ ) {
              const cell = tableData[row][col];
              if ( cell ) {
                cell.classNames = [];
              }
            }
          }
        } else {
          for ( let row = y2 - 1; row < y1; row++ ) {
            for ( let col = x2 - 1; col < x1; col++ ) {
              const cell = tableData[row][col];
              if ( cell ) {
                cell.classNames = [];
              }
            }
          }
        }
      }

      // Update the table data and reset all selections made
      this.setState({ tableData }, () => this.resetSelections());
    }
  }

  resetSelections() {
    const table = this.tableRef;
    if ( table ) {
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

  resetEmptyCells(x1: number, x2: number, y1: number, y2: number) {
    if ( !this.selection ) { return; }

    // Typescript and HTML Element types do not play nicely, so we use 'any'
    const table: any = this.tableRef;
    const rows = table!.querySelectorAll('tr');
    rows.forEach((row: any, index: number) => {
      // We know this.selection is defined, byt Typescript misses it in this nested
      // function
      if ( this.selection!.y1 < this.selection!.y2 ) {
        if ( index >= this.selection!.y1 && index <= this.selection!.y2 ) {
          // reset cell class names on the vertical axes
          let colIndex = x1;
          while ( colIndex > x2 ) {
            row.children[colIndex].className = '';
            colIndex = colIndex - 1;
          }
        }
      } else {
        if ( index >= this.selection!.y2 && index <= this.selection!.y1 ) {
          // reset cell class names on the vertical axes
          let colIndex = x1;
          while ( colIndex > x2 ) {
            row.children[colIndex].className = '';
            colIndex = colIndex - 1;
          }
        }
      }
    });

    // reset cell class names on the horizontal axes
    let rowIndex = y1;
    while ( rowIndex > y2 ) {
      const row = rows[rowIndex];
      if ( this.selection.x1 < this.selection.x2 ) {
        let colIndex = this.selection.x1;
        while ( colIndex <= this.selection.x2 ) {
          row.children[colIndex].className = '';
          colIndex = colIndex + 1;
        }
      } else {
        let colIndex = this.selection.x2;
        while ( colIndex <= this.selection.x1 ) {
          row.children[colIndex].className = '';
          colIndex = colIndex + 1;
        }
      }
      rowIndex = rowIndex - 1;
    }
  }

  updateSelections(selectedBlock?: AnnotationBlock) {
    if ( !selectedBlock ) {
      selectedBlock = this.state.selectedAnnotationBlock;
    }

    if (!this.selection) {
      console.warn("updateSelections should probably not be called without an existing selection");
      // If this warning shows up, you need to figure out whether it is actually OK for this function
      // to be called without an existing selection. If it is, remove the warning.

      return;
    }

    const table: any = this.tableRef;
    if ( !table ) { return; }

    // Reset selections before update
    this.resetSelections();
    table.classList.add('active');

    const classNames: string[] = ['active'];
    if ( selectedBlock ) {
      const { role } = selectedBlock;
      classNames.push(`active`);
      if ( role ) {
        classNames.push(`role-${role}`);
      }
    }

    const rows = table.querySelectorAll('tr');
    const { x1, x2, y1, y2 } = this.selection;
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

  standardizeSelection() {
    if (!this.selection) {
      return;
    }

    let temp;
    if ( this.selection.x2 < this.selection.x1 ) {
      temp = this.selection.x1;
      this.selection.x1 = this.selection.x2;
      this.selection.x2 = temp;
    }
    if ( this.selection.y2 < this.selection.y1 ) {
      temp = this.selection.y1;
      this.selection.y1 = this.selection.y2;
      this.selection.y2 = temp;
    }
  }

  selectCell(cell: Element, rowIndex: number, colIndex: number, topRow: number, leftCol: number, rightCol: number, bottomRow: number, classNames: string[] = []) {
    // Apply class names to the selected cell
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

    // Add resize corner to the active selection areas
    if ( classNames.includes('active') ) {
      if (rowIndex === bottomRow && colIndex === rightCol) {
        const resizeCorner = document.createElement('div');
        resizeCorner.classList.add('cell-resize-corner');
        cell.appendChild(resizeCorner);
      }
    }
  }

  openAnnotationMenu(event: MouseEvent) {
    let { pageX, pageY } = event;
    pageX = pageX - 250;
    if ( settings.window.height - pageY <= 275 ) {
      pageY -= 275;
    } else {
      pageY = pageY - 10;
    }
    this.setState({
      showAnnotationMenu: true,
      annotationMenuPosition: [pageX, pageY],
    });
  }

  checkOverlaps() {
    const { x1, y1, x2, y2 } = this.selection;

    // Get the coordinates of the sides
    const aTop = y1 <= y2 ? y1 : y2;
    const aLeft = x1 <= x2 ? x1 : x2;
    const aRight = x2 >= x1 ? x2 : x1;
    const aBottom = y2 >= y1 ? y2 : y1;

    const { blocks } = wikiStore.annotations;
    for (let i = 0; i < blocks.length; i++ ) {
      const other = blocks[i].selection;

      // Get the coordinates of the sides
      const bTop = other.y1 <= other.y2 ? other.y1 : other.y2;
      const bLeft = other.x1 <= other.x2 ? other.x1 : other.x2;
      const bRight = other.x2 >= other.x1 ? other.x2 : other.x1;
      const bBottom = other.y2 >= other.y1 ? other.y2 : other.y1;

      // check for collisions between area A and B
      if (aTop > bBottom) {
        continue;
      }
      if (aBottom < bTop) {
        continue;
      }
      if (aLeft > bRight) {
        continue;
      }
      if (aRight < bLeft) {
        continue;
      }

      // collision detected
      return true;
    }

    // no collisions detected
    return false;
  }

  handleOnMouseUp(event: MouseEvent) {
    this.selecting = false;
    if ( this.selection ) {
      this.standardizeSelection();
      if ( this.checkOverlaps() ) {
        this.closeAnnotationMenu();
      } else {
        this.openAnnotationMenu(event);
      }
    }
  }

  handleOnMouseDown(event: React.MouseEvent) {
    const element = event.target as any;

    // Allow users to select the resize-corner of the cell
    if ( element.className === 'cell-resize-corner' ) {
      this.prevElement = element.parentElement;
      this.selecting = true;
      return;
    } else if ( element.nodeName !== 'TD' ) { return; }

    // Set both coordinates to the same cell
    const x1: number = element.cellIndex;
    const x2: number = element.cellIndex;
    const y1: number = element.parentElement.rowIndex;
    const y2: number = element.parentElement.rowIndex;
    const selection: CellSelection = { x1, x2, y1, y2 };

    // check if the user is selecting an annotation block
    const selectedBlock = this.checkSelectedAnnotationBlocks(selection);
    if ( selectedBlock ) {

      // Reset annotation menu
      if ( selectedBlock !== this.state.selectedAnnotationBlock ) {
        this.setState({
          showAnnotationMenu: false,
          selectedAnnotationBlock: undefined,
        }, () => {
          this.selection = selectedBlock.selection;
          this.setState({ selectedAnnotationBlock: selectedBlock });
          this.updateSelections(selectedBlock);
        });
      }

      return;
    }

    // Activate the selection mode
    this.selecting = true;

    // Extend the previous selection if user is holding down Shift key
    if (event.shiftKey && this.selection) {

      // Extend the previous selection left or right
      if (x1 !== this.selection['x1']) {
        if (x1 < this.selection['x1']) {
          this.selection['x1'] = x1;
        } else {
          this.selection['x2'] = x1;
        }
      }

      // Extend the previous selection up or down
      if (y1 !== this.selection['y1']) {
        if (y1 < this.selection['y1']) {
          this.selection['y1'] = y1;
        } else {
          this.selection['y2'] = y1;
        }
      }

      this.updateSelections();
    } else {

      // Reset annotation menu
      this.setState({
        showAnnotationMenu: false,
        selectedAnnotationBlock: undefined,
      }, () => {
        this.resetSelections();

        // Activate the element on click
        this.selectCell(element, y1, x1, y1, x1, x1, y1, ['active']);
        this.selection = { x1, x2, y1, y2 };
      });
    }

    // Initialize the previous element with the one selected
    this.prevElement = element;
  }

  handleOnMouseMove(event: React.MouseEvent) {
    const element = event.target as any;
    if (element === this.prevElement) { return; }

    // Don't allow out-of-bounds resizing
    if ( element.nodeName !== 'TD' ) {
      return;
    }

    if (this.selecting && !event.shiftKey) {
      if ( !this.selection ) { return; }

      // Update the last x coordinate of the selection
      const newCellIndex = element.cellIndex;
      this.selection.x2 = newCellIndex;

      // Update the last y coordinate of the selection
      const newRowIndex = element.parentElement.rowIndex;
      this.selection.y2 = newRowIndex;

      if ( this.prevElement.nodeName === 'TD' ) {
        const oldCellIndex = this.prevElement.cellIndex;
        const oldRowIndex = this.prevElement.parentElement.rowIndex;
        if ( newCellIndex <= oldCellIndex || newRowIndex <= oldRowIndex ) {
          this.resetEmptyCells(oldCellIndex, newCellIndex, oldRowIndex, newRowIndex);
        }
      }

      // Update selections
      this.updateSelections();

      // Update reference to the previous element
      this.prevElement = element;

      // Trigger a render of the annotation menu
      this.setState({ showAnnotationMenu: true });
    }
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

    // Close annotation menu with ESC key
    if (event.code === 'Escape' ) {
      this.closeAnnotationMenu();
    }

    const arrowCodes = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
    if ( arrowCodes.includes(event.code) && this.selection ) {

      // Don't allow moving around when users are typing
      if ( (event.target as any).nodeName === 'INPUT' ) { return; }

      event.preventDefault();

      this.setState({ selectedAnnotationBlock: undefined });

      const { x1, x2, y1, y2 } = this.selection;
      const table: any = this.tableRef;
      const rows = table!.querySelectorAll('tr');

      // arrow up
      if (event.code === 'ArrowUp' && y1 > 1) {
        this.resetSelections();
        const nextElement = rows[y1 - 1].children[x1];
        if (event.shiftKey) {
          if (y1 === y2) {
            this.selection = { 'x1': x1, 'x2': x2, 'y1': y1 - 1, 'y2': y2 };
            this.prevDirection = 'up';
          } else {
            if (this.prevDirection === 'down') {
              this.selection = { 'x1': x1, 'x2': x2, 'y1': y1, 'y2': y2 - 1 };
            } else {
              this.selection = { 'x1': x1, 'x2': x2, 'y1': y1 - 1, 'y2': y2 };
              this.prevDirection = 'up';
            }
          }
        } else {
          this.selection = { 'x1': x1, 'x2': x1, 'y1': y1 - 1, 'y2': y1 - 1 };
          this.selectCell(nextElement, y1 - 1, x1, y1 - 1, x1, x1, y1 - 1, ['active']);
          const selection: CellSelection = { 'x1': x1, 'x2': x1, 'y1': y1 - 1, 'y2': y1 - 1 };
          const selectedBlock = this.checkSelectedAnnotationBlocks(selection);
          if (selectedBlock) {
            this.setState({
              showAnnotationMenu: true,
              selectedAnnotationBlock: selectedBlock,
            }, () => {
              this.selection = selectedBlock.selection;
            });
          }
        }
        this.prevElement = nextElement;
        this.updateSelections();
      }

      // arrow down
      if (event.code === 'ArrowDown' && y1 < rows.length - 1) {
        this.resetSelections();
        const nextElement = rows[y1 + 1].children[x1];
        if (event.shiftKey) {
          if (y1 === y2) {
            this.selection = { 'x1': x1, 'x2': x2, 'y1': y1, 'y2': y2 + 1 };
            this.prevDirection = 'down';
          } else {
            if (this.prevDirection === 'up') {
              this.selection = { 'x1': x1, 'x2': x2, 'y1': y1 + 1, 'y2': y2 };
            } else {
              this.selection = { 'x1': x1, 'x2': x2, 'y1': y1, 'y2': y2 + 1 };
              this.prevDirection = 'down';
            }
          }
        } else {
          this.selection = { 'x1': x1, 'x2': x1, 'y1': y1 + 1, 'y2': y1 + 1 };
          this.selectCell(nextElement, y1 + 1, x1, y1 + 1, x1, x1, y1 + 1, ['active']);
          const selection: CellSelection = { 'x1': x1, 'x2': x1, 'y1': y1 + 1, 'y2': y1 + 1 };
          const selectedBlock = this.checkSelectedAnnotationBlocks(selection);
          if (selectedBlock) {
            this.setState({
              showAnnotationMenu: true,
              selectedAnnotationBlock: selectedBlock,
            }, () => {
              this.selection = selectedBlock.selection;
            });
          }
        }
        this.prevElement = nextElement;
        this.updateSelections();
      }

      // arrow left
      if (event.code === 'ArrowLeft' && x1 > 1) {
        this.resetSelections();
        const nextElement = rows[y1].children[x1 - 1];
        if (event.shiftKey) {
          if (x1 === x2) {
            this.selection = { 'x1': x1 - 1, 'x2': x2, 'y1': y1, 'y2': y2 };
            this.prevDirection = 'left';
          } else {
            if (this.prevDirection === 'right') {
              this.selection = { 'x1': x1, 'x2': x2 - 1, 'y1': y1, 'y2': y2 };
            } else {
              this.selection = { 'x1': x1 - 1, 'x2': x2, 'y1': y1, 'y2': y2 };
              this.prevDirection = 'left';
            }
          }
        } else {
          this.selection = { 'x1': x1 - 1, 'x2': x1 - 1, 'y1': y1, 'y2': y1 };
          this.selectCell(nextElement, y1, x1 - 1, y1, x1 - 1, x1 - 1, y1, ['active']);
          const selection: CellSelection = { 'x1': x1 - 1, 'x2': x1 - 1, 'y1': y1, 'y2': y1 };
          const selectedBlock = this.checkSelectedAnnotationBlocks(selection);
          if (selectedBlock) {
            this.setState({
              showAnnotationMenu: true,
              selectedAnnotationBlock: selectedBlock,
            }, () => {
              this.selection = selectedBlock.selection;
            });
          }
        }
        this.prevElement = nextElement;
        this.updateSelections();
      }

      // arrow right
      if (event.code === 'ArrowRight' && x1 < rows[y1].children.length - 1) {
        this.resetSelections();
        const nextElement = rows[y1].children[x1 + 1];
        if (event.shiftKey) {
          if (x1 === x2) {
            this.selection = { 'x1': x1, 'x2': x2 + 1, 'y1': y1, 'y2': y2 };
            this.prevDirection = 'right';
          } else {
            if (this.prevDirection === 'left') {
              this.selection = { 'x1': x1 + 1, 'x2': x2, 'y1': y1, 'y2': y2 };
            } else {
              this.selection = { 'x1': x1, 'x2': x2 + 1, 'y1': y1, 'y2': y2 };
              this.prevDirection = 'right';
            }
          }
        } else {
          this.selection = { 'x1': x1 + 1, 'x2': x1 + 1, 'y1': y1, 'y2': y1 };
          this.selectCell(nextElement, y1, x1 + 1, y1, x1 + 1, x1 + 1, y1, ['active']);
          const selection: CellSelection = { 'x1': x1 + 1, 'x2': x1 + 1, 'y1': y1, 'y2': y1 };
          const selectedBlock = this.checkSelectedAnnotationBlocks(selection);
          if (selectedBlock) {
            this.setState({
              showAnnotationMenu: true,
              selectedAnnotationBlock: selectedBlock,
            }, () => {
              this.selection = selectedBlock.selection;
            });
          }
        }
        this.prevElement = nextElement;
        this.updateSelections();
      }

      // Trigger a render of the annotation menu
      this.setState({ showAnnotationMenu: true });
    }
  }

  closeAnnotationMenu() {
    this.setState({
      showAnnotationMenu: false,
      selectedAnnotationBlock: undefined,
    }, () => {
      this.resetSelections();
      this.updateAnnotationBlocks();
    });
  }

  renderAnnotationMenu() {
    const {
      showAnnotationMenu,
      annotationMenuPosition,
      selectedAnnotationBlock,
    } = this.state;
    if (showAnnotationMenu) {
      return (
        <AnnotationMenu
          selectedAnnotationBlock={selectedAnnotationBlock}
          selection={this.selection}
          position={annotationMenuPosition}
          onClose={() => this.closeAnnotationMenu()}
          onDelete={this.deleteAnnotationBlock.bind(this)} />
      )
    }
  }

  renderTable() {
    return (
      <Table
        tableData={this.state.tableData}
        onMouseDown={this.handleOnMouseDown.bind(this)}
        onMouseMove={this.handleOnMouseMove.bind(this)}
        onClickHeader={this.handleOnClickHeader.bind(this)}
        setTableReference={this.setTableReference.bind(this)} />
    )
  }

  render() {
    return (
      <Fragment>
        {this.renderTable()}
        {this.renderAnnotationMenu()}
      </Fragment>
    )
  }
}


export default AnnotationTable;
