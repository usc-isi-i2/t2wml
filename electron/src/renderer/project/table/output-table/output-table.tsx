//fills in tabledata and the mouse events, renders a "table" with those properties

//replace this with table-wrapper and the individual output-table and annotation-table components


import React, { Component } from 'react';
import { observer } from 'mobx-react';
import { IReactionDisposer, reaction } from 'mobx';
import Table from '../table';
import wikiStore from '../../../data/store';
import { Cell, ErrorMessage } from '../../../common/general';
import { QNode, TableCell, TableDTO } from '../../../common/dtos';
import TableToast from '../table-toast';

interface TableState {
    tableData: any;
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
            tableData: null,
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

    updateTableData(table?: TableDTO) {
        if (!table || !table.cells) { return; }
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
        this.setState({ tableData: tableData });
    }

    selectCell(cell: Element, classNames: string[] = []) {
        // Activate the current cell
        cell.classList.add('active');
        classNames.map(className => cell.classList.add(className));
    }

    selectRelatedCells(row: number, col: number) {
        const selectedCell = new Cell(col - 1, row - 1);

        //TODO:
        //this.setState({selectedCell, showToast: true});

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
                    this.selectCell(tableCell, ['role-qualifier']);
                }
            });
        }

        // Select the cell with the main-subject
        if ('subject' in statement.cells) {
            const y = statement.cells.subject[0];
            const x = statement.cells.subject[1];
            const cell = rows[y + 1].children[x + 1];
            this.selectCell(cell, ['role-mainSubject']);
        }

        // Select the cell with the property
        if ('property' in statement.cells) {
            const y = statement.cells.property[0];
            const x = statement.cells.property[1];
            const cell = rows[y + 1].children[x + 1];
            this.selectCell(cell, ['role-property']);
        }
    }

    handleOnMouseUp(event: React.MouseEvent) {

    }

    handleOnMouseDown(event: React.MouseEvent) {
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
        this.setState({showToast: false});
      }
    
  renderToast() {
    const {selectedCell, showToast } = this.state;
    if ( showToast) {
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
        return <div>
            {this.renderToast()}

            <Table
                tableData={this.state.tableData}
                onMouseUp={this.handleOnMouseUp.bind(this)}
                onMouseDown={this.handleOnMouseDown.bind(this)}
                onMouseMove={this.handleOnMouseMove.bind(this)}
                onClickHeader={this.handleOnClickHeader.bind(this)}
                setTableReference={this.setTableReference.bind(this)} />
        </div>
    }
}

export default OutputTable;
