import React, { Component, Fragment } from 'react';
import { observer } from 'mobx-react';
import Table from '../table';
import { IReactionDisposer, reaction } from 'mobx';
import RequestService from '../../../common/service';
import wikiStore from '@/renderer/data/store';
import { AnnotationBlock, AnnotationBlockRole, ResponseWithSuggestion, TableCell, TableData, TableDTO } from '../../../common/dtos';
import { CellSelection } from '../../../common/general';
import AnnotationMenu from './annotation-menu';
import * as utils from '../table-utils';
import { currentFilesService } from '@/renderer/common/current-file-service';


interface TableState {
  tableData?: TableData;
  showAnnotationMenu: boolean;
  selectedAnnotationBlock?: AnnotationBlock;
  annotationSuggestionsSelectedBlock: ResponseWithSuggestion;
}


type Direction = 'up' | 'down' | 'left' | 'right';


@observer
class AnnotationTable extends Component<{}, TableState> {
  private tableRef = React.createRef<HTMLTableElement>().current!;
  private prevElement?: any; // We use any here, since the HTML element type hierarchy is too messy
  private prevDirection?: Direction;
  private selecting = false;
  private selection?: CellSelection;
  private requestService: RequestService;

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
      selectedAnnotationBlock: undefined,
      annotationSuggestionsSelectedBlock: { roles: [], types: [], children: {}}
    };

    this.handleOnKeyDown = this.handleOnKeyDown.bind(this);
    this.handleOnMouseUp = this.handleOnMouseUp.bind(this);
    this.requestService = new RequestService();
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

    if (currentFilesService.currentState.mappingFile)
        {this.updateAnnotationBlocks(tableData);}
    else{
      this.updateQnodes(tableData);
    }
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
        const { role, type, selection, property } = block;
        const classNames: string[] = [];
        if ( role ) {
          if((role == "qualifier" as AnnotationBlockRole || role == "dependentVar" as AnnotationBlockRole ) && !property){
            classNames.push(`role-${role}-no-property`);
          } else{
            classNames.push(`role-${role}`);
          }
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
              if ( cell ) {
                cell.classNames = classNames;
              }
            }
          }
        }
      }
    }
    this.updateQnodes(tableData)
  }

  updateQnodes(tableData?: TableData){
    const qnodes = wikiStore.layers.qnode;
    if (!tableData) { return; }
    for (const entry of qnodes.entries) {
      for (const indexPair of entry.indices) {
        const tableCell = tableData[indexPair[0]][indexPair[1]];
        tableCell.classNames.push(`type-wikibaseitem`);
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
      this.setState({ tableData }, () => this.resetSelection());
    }
  }

  resetSelection() {
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
      this.setState({annotationSuggestionsSelectedBlock: { roles: [], types: [], children: {}}});
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

  async getAnnotationSuggestionsForSelection(selection: { 'x1':number, 'x2':number, 'y1':number, 'y2':number}){
    //data should be a json dictionary, with fields:
    // {
    //   "selection": The block,
    //   "annotations": the existing annotations (a list of blocks, for the first block this would be an empty list)
    // }
    const suggestion = await this.requestService.getAnnotationSuggestions({"selection": selection, "annotations": wikiStore.annotations.blocks});
    this.setState({annotationSuggestionsSelectedBlock: suggestion})
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

    this.getAnnotationSuggestionsForSelection(this.selection)

    const table: any = this.tableRef;
    if ( !table ) { return; }

    // Reset selections before update
    this.resetSelection();
    table.classList.add('active');

    const classNames: string[] = ['active'];
    const linksBlocks: {block: AnnotationBlock, classNames: string[]}[] = [];
    if ( selectedBlock ) {
      const { role, property, links } = selectedBlock;
      if ( role ) {
        if((role == "qualifier" as AnnotationBlockRole || role == "dependentVar" as AnnotationBlockRole ) && !property){
          classNames.push(`role-${role}-no-property`);
        } else{
          classNames.push(`role-${role}`);
        }
      }
      if (links){
        for ( const block of wikiStore.annotations.blocks ) {
          if((links.property && block.id == links.property) || (links.subject &&  block.id == links.subject)){
            const linkedBlock = { ...block };
            linksBlocks.push({classNames: ['active', `role-${linkedBlock.role}`], block: linkedBlock})
          }
        }
      }
    }
    this.selectBlock(this.selection, table, classNames);
    for(const linkedBlock of linksBlocks){
      const { selection } = linkedBlock.block;
      this.selectBlock(selection, table, linkedBlock.classNames);
    }
    
  }

  selectBlock(selection:CellSelection, table: any, classNames: string[]){
    const { x1, x2, y1, y2 } = selection;
    const rows = table.querySelectorAll('tr');
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

  checkOverlaps() {
    if ( !this.selection ) { return; }
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

  handleOnMouseUp() {
    if ( this.selection ) {
      this.selection = utils.standardizeSelection(this.selection);
      const { selectedAnnotationBlock } = this.state;
      if ( !selectedAnnotationBlock && this.selecting && this.checkOverlaps() ) {
        this.closeAnnotationMenu();
      } else {
        this.setState({showAnnotationMenu: true});
      }
    }
    this.selecting = false;
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
    const selectedBlock = utils.checkSelectedAnnotationBlocks(selection);
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
        this.resetSelection();

        // Activate the element on click
        this.selectCell(element, y1, x1, y1, x1, x1, y1, ['active']);
        this.selection = { x1, x2, y1, y2 };
        this.getAnnotationSuggestionsForSelection(this.selection)
      });
    }

    // Initialize the previous element with the one selected
    this.prevElement = element;
  }

  handleOnMouseMove(event: React.MouseEvent) {
    const { selectedAnnotationBlock } = this.state;
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
        if ( selectedAnnotationBlock ) {
          if ( newCellIndex <= oldCellIndex || newRowIndex <= oldRowIndex ) {
            this.resetEmptyCells(oldCellIndex, newCellIndex, oldRowIndex, newRowIndex);
          }
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

      // Don't allow moving around when selecting from the dropdown menu
      if ( (event.target as any).nodeName === 'SELECT' ) { return; }

      event.preventDefault();

      this.setState({ selectedAnnotationBlock: undefined });

      const { x1, x2, y1, y2 } = this.selection;
      const table: any = this.tableRef;
      const rows = table!.querySelectorAll('tr');

      // arrow up
      if (event.code === 'ArrowUp' && y1 > 1) {
        this.resetSelection();
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
          const selectedBlock = utils.checkSelectedAnnotationBlocks(selection);
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
        this.resetSelection();
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
          const selectedBlock = utils.checkSelectedAnnotationBlocks(selection);
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
        this.resetSelection();
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
          const selectedBlock = utils.checkSelectedAnnotationBlocks(selection);
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
        this.resetSelection();
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
          const selectedBlock = utils.checkSelectedAnnotationBlocks(selection);
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

  deleteRolePrevSelection(){
    const table = this.tableRef;
    if ( table ) {
      table.querySelectorAll('td[class*="active"]').forEach(e => {
        e.classList.forEach(className => {
          if (className.startsWith('role-')) {
            e.classList.remove(className);
          }
        });
      });
    }
  }

  onSelectionChange(selection: CellSelection) {
    if ( selection ) {
      const {selectedAnnotationBlock} = this.state;
      this.selection = selection;
      this.deleteRolePrevSelection();
      this.updateSelections();
      this.setState({showAnnotationMenu: false}, () => {
        selectedAnnotationBlock!.selection = selection;
        this.setState({
          showAnnotationMenu: true,
          selectedAnnotationBlock,
        })
      })
    }
  }

  closeAnnotationMenu() {
    this.setState({
      showAnnotationMenu: false,
      selectedAnnotationBlock: undefined,
    }, () => {
      this.resetSelection();
      this.selection = undefined;
      this.updateAnnotationBlocks();
    });
  }

  renderAnnotationMenu() {
    const {
      showAnnotationMenu,
      selectedAnnotationBlock,
      annotationSuggestionsSelectedBlock
    } = this.state;
    if (showAnnotationMenu) {
      return (
        <AnnotationMenu
        key={annotationSuggestionsSelectedBlock.roles.toString()}
          selection={this.selection}
          onSelectionChange={this.onSelectionChange.bind(this)}
          selectedAnnotationBlock={selectedAnnotationBlock}
          onClose={() => this.closeAnnotationMenu()}
          onDelete={this.deleteAnnotationBlock.bind(this)}
        annotationSuggestions={annotationSuggestionsSelectedBlock}
          />
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
