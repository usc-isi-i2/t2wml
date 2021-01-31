//fills in tabledata and the mouse events, renders a "table" with those properties

import React, { Component, Fragment } from 'react';
import { observer } from 'mobx-react';
import Table from '../table';
import { IReactionDisposer, reaction } from 'mobx';
import wikiStore from '@/renderer/data/store';
import { AnnotationBlock, TableCell, TableDTO } from '../../../common/dtos';
import { CellSelection } from '../../../common/general';
import { config } from '../../../../main/config';
import AnnotationMenu from './annotation-menu';
import RequestService from '@/renderer/common/service';
import { settings } from '../../../../main/settings';


interface TableState {
  tableData: TableCell[][] | undefined;
  showAnnotationMenu: boolean,
  annotationMenuPosition?: Array<number>,
  selectedAnnotationBlock?: AnnotationBlock,
}


@observer
class AnnotationTable extends Component<{}, TableState> {
  private tableRef = React.createRef<HTMLTableElement>().current!;
  private prevElement?: EventTarget;
  private prevDirection?: 'up' | 'down' | 'left' | 'right';
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
  }

  private disposers: IReactionDisposer[] = [];

  componentDidMount() {
    this.updateTableData(wikiStore.table.table);
    document.addEventListener('keydown', this.handleOnKeyDown);

    this.disposers.push(reaction(() => wikiStore.table.table, (table) => this.updateTableData(table)));
    this.disposers.push(reaction(() => wikiStore.annotations.blocks, () => this.updateAnnotationBlocks()));

  }

  componentWillUnmount() {
    document.removeEventListener('keydown', this.handleOnKeyDown);
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
    //checks if a given selection is part of an annotation block
    //if so, returns the annotation block
    const { x1, x2, y1, y2 } = selection;
    for (const block of wikiStore.annotations.blocks) {
      for (const selection of block.selections) {
        if (selection['y1'] <= selection['y2']) {
          if (selection['x1'] <= selection['x2']) {
            if (x1 >= selection['x1'] &&
              x2 <= selection['x2'] &&
              y1 >= selection['y1'] &&
              y2 <= selection['y2']) {
              return block;
            }
          } else {
            if (x1 <= selection['x1'] &&
              x2 >= selection['x2'] &&
              y1 >= selection['y1'] &&
              y2 <= selection['y2']) {
              return block;
            }
          }
        } else {
          if (selection['x1'] <= selection['x2']) {
            if (x1 >= selection['x1'] &&
              x2 <= selection['x2'] &&
              y1 <= selection['y1'] &&
              y2 >= selection['y2']) {
              return block;
            }
          } else {
            if (x1 <= selection['x1'] &&
              x2 >= selection['x2'] &&
              y1 <= selection['y1'] &&
              y2 >= selection['y2']) {
              return block;
            }
          }
        }
      }
    }
    return null;
  }

  updateAnnotationBlocks(tableData?: TableCell[][]) {
    if ( !tableData ) {
      tableData = this.state.tableData;
    }

    const table: any = this.tableRef;
    if ( !table ) { return; }

    if ( wikiStore.annotations.blocks && tableData ) {

      for ( const block of wikiStore.annotations.blocks ) {
        const { role, type, selections } = block;
        const classNames: string[] = [];
        if ( role ) {
          classNames.push(`role-${role}`);
        }
        if ( type ) {
          classNames.push(`type-${type}`);
        }
        for ( const selection of selections ) {
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
          if ( y1 <= y2 ) {
            if ( x1 <= x2 ) {
              for ( let row = y1; row <= y2; row++ ) {
                for ( let col = x1; col <= x2; col++ ) {
                  try {
                    const cell = tableData[row - 1][col - 1];
                    cell.classNames = classNames;
                  } catch {
                    let rx = row;
                    while ( rx > tableData.length ) {
                      const emptyArray = Array.apply({}, new Array(col));
                      tableData.push(emptyArray);
                      rx -= 1;
                    }
                    let cx = col;
                    while ( cx > tableData[0].length ) {
                      tableData.forEach(tableRow => tableRow.push({}));
                      cx -= 1;
                    }
                    const cell = tableData[row - 1][col - 1];
                    cell.classNames = classNames;
                  }
                }
              }
            } else {
              for ( let row = y1; row <= y2; row++ ) {
                for ( let col = x2; col <= x1; col++ ) {
                  try {
                    const cell = tableData[row - 1][col - 1];
                    cell.classNames = classNames;
                  } catch {
                    let rx = row;
                    while ( rx > tableData.length ) {
                      const emptyArray = Array.apply({}, new Array(col));
                      tableData.push(emptyArray);
                      rx -= 1;
                    }
                    let cx = col;
                    while ( cx > tableData[0].length ) {
                      tableData.forEach(tableRow => tableRow.push({}));
                      cx -= 1;
                    }
                    const cell = tableData[row - 1][col - 1];
                    cell.classNames = classNames;
                  }
                }
              }
            }
          } else {
            if ( x1 <= x2 ) {
              for ( let row = y2; row <= y1; row++ ) {
                for ( let col = x1; col <= x2; col++ ) {
                  try {
                    const cell = tableData[row - 1][col - 1];
                    cell.classNames = classNames;
                  } catch {
                    let rx = row;
                    while ( rx > tableData.length ) {
                      const emptyArray = Array.apply({}, new Array(col));
                      tableData.push(emptyArray);
                      rx -= 1;
                    }
                    let cx = col;
                    while ( cx > tableData[0].length ) {
                      tableData.forEach(tableRow => tableRow.push({}));
                      cx -= 1;
                    }
                    const cell = tableData[row - 1][col - 1];
                    cell.classNames = classNames;
                  }
                }
              }
            } else {
              for ( let row = y2; row <= y1; row++ ) {
                for ( let col = x2; col <= x1; col++ ) {
                  try {
                    const cell = tableData[row - 1][col - 1];
                    cell.classNames = classNames;
                  } catch {
                    let rx = row;
                    while ( rx > tableData.length ) {
                      const emptyArray = Array.apply({}, new Array(col));
                      tableData.push(emptyArray);
                      rx -= 1;
                    }
                    let cx = col;
                    while ( cx > tableData[0].length ) {
                      tableData.forEach(tableRow => tableRow.push({}));
                      cx -= 1;
                    }
                    const cell = tableData[row - 1][col - 1];
                    cell.classNames = classNames;
                  }
                }
              }
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
      for ( const selection of block.selections ) {
        const { x1, y1, x2, y2 } = selection;
        if ( y1 <= y2 ) {
          if ( x1 <= x2 ) {
            for ( let row = y1; row <= y2; row++ ) {
              for ( let col = x1; col <= x2; col++ ) {
                const cell = tableData[row - 1][col - 1];
                cell.classNames = [];
              }
            }
          } else {
            for ( let row = y1; row <= y2; row++ ) {
              for ( let col = x2; col <= x1; col++ ) {
                const cell = tableData[row - 1][col - 1];
                cell.classNames = [];
              }
            }
          }
        } else {
          if ( x1 <= x2 ) {
            for ( let row = y2; row <= y1; row++ ) {
              for ( let col = x1; col <= x2; col++ ) {
                const cell = tableData[row - 1][col - 1];
                cell.classNames = [];
              }
            }
          } else {
            for ( let row = y2; row <= y1; row++ ) {
              for ( let col = x2; col <= x1; col++ ) {
                const cell = tableData[row - 1][col - 1];
                cell.classNames = [];
              }
            }
          }
        }
      }
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

  resetEmptyCells(x1, x2, y1, y2) {
    if ( !this.selection ) { return; }

    const table: any = this.tableRef;
    const rows = table!.querySelectorAll('tr');
    rows.forEach((row: any, index) => {
      if ( this.selection.y1 < this.selection.y2 ) {
        if ( index >= this.selection.y1 && index <= this.selection.y2 ) {
          // reset cell class names on the vertical axes
          let colIndex = x1;
          while ( colIndex > x2 ) {
            row.children[colIndex].className = '';
            colIndex = colIndex - 1;
          }
        }
      } else {
        if ( index >= this.selection.y2 && index <= this.selection.y1 ) {
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
      let row = rows[rowIndex];
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

  standardizeSelections() {
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

  checkSelectionOverlaps() {
    this.selections.map((selection, i) => {
      const { x1, y1, x2, y2 } = selection;

      // Get the coordinates of the sides
      const aTop = y1 <= y2 ? y1 : y2;
      const aLeft = x1 <= x2 ? x1 : x2;
      const aRight = x2 >= x1 ? x2 : x1;
      const aBottom = y2 >= y1 ? y2 : y1;

      for ( let j = 0; j < this.selections.length; j++ ) {
        if ( j !== i ) {
          const area = this.selections[j];

          // Get the coordinates of the sides
          const bTop = area.y1 <= area.y2 ? area.y1 : area.y2;
          const bLeft = area.x1 <= area.x2 ? area.x1 : area.x2;
          const bRight = area.x2 >= area.x1 ? area.x2 : area.x1;
          const bBottom = area.y2 >= area.y1 ? area.y2 : area.y1;

          // check for no-collisions between area A and B
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

          if (bTop <= aTop &&
            bLeft <= aLeft &&
            bRight >= aRight &&
            bBottom >= aBottom) {
            this.selections.splice(i, 1);
          } else {
            this.selections.splice(j, 1);
          }
          break;
        }
      }
    });
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

  openAnnotationMenu(event: React.MouseEvent) {
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

  handleOnMouseUp(event: React.MouseEvent) {
    this.selecting = false;
    if ( this.selection ) {
      this.standardizeSelections();
      this.checkSelectionOverlaps();
      this.openAnnotationMenu(event);
    }
  }

  handleOnMouseDown(event: React.MouseEvent) {
    const { selectedAnnotationBlock } = this.state;
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
    if (selectedBlock) {
      this.selection = selectedBlock.selections[0];
      this.setState({ selectedAnnotationBlock: selectedBlock });
      this.updateSelections(selectedBlock);
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
    if (event.keyCode == 27) {
      this.closeAnnotationMenu();
    }

    if ( [37, 38, 39, 40].includes(event.keyCode) && this.selection ) {

      // Don't allow moving around when users are typing
      if ( event.target.nodeName === 'INPUT' ) { return; }

      event.preventDefault();

      this.setState({ selectedAnnotationBlock: undefined });

      const { x1, x2, y1, y2 } = this.selection;
      const table: any = this.tableRef;
      const rows = table!.querySelectorAll('tr');

      // arrow up
      if (event.keyCode == 38 && y1 > 1) {
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
              this.selection = selectedBlock.selections[0];
            });
          }
        }
        this.prevElement = nextElement;
        this.updateSelections();
      }

      // arrow down
      if (event.keyCode == 40 && y1 < rows.length - 1) {
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
              this.selection = selectedBlock.selections[0];
            });
          }
        }
        this.prevElement = nextElement;
        this.updateSelections();
      }

      // arrow left
      if (event.keyCode == 37 && x1 > 1) {
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
              this.selection = selectedBlock.selections[0];
            });
          }
        }
        this.prevElement = nextElement;
        this.updateSelections();
      }

      // arrow right
      if (event.keyCode == 39 && x1 < rows[y1].children.length - 1) {
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
              this.selection = selectedBlock.selections;
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
        onMouseUp={this.handleOnMouseUp.bind(this)}
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
