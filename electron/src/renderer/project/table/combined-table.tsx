///header, footer (with sheet switcher), switcher between different table components

import React, { ChangeEvent, Component } from 'react';
import * as path from 'path';
import './table-component.css';

import { Button, ButtonGroup, Card, OverlayTrigger, Spinner, Tooltip } from 'react-bootstrap';

import { AnnotationBlock, TableCell, TableData, TableDTO } from '../../common/dtos';
import { LOG, ErrorMessage, Cell, CellSelection } from '../../common/general';
import RequestService from '../../common/service';
import SheetSelector from '../sheet-selector/sheet-selector';
import ToastMessage from '../../common/toast';
import TableLegend from './table-legend';

import { checkSelectedAnnotationBlocks, standardizeSelection } from './table-utils';
import { observer } from 'mobx-react';
import wikiStore, { TableMode } from '../../data/store';
import { IReactionDisposer, reaction } from 'mobx';
import { currentFilesService } from '../../common/current-file-service';
import Table from './table';
type Direction = 'up' | 'down' | 'left' | 'right';

interface TableState {
    showSpinner: boolean;
    showToast: boolean;

    // table data
    filename?: string; // if undefined, show "Table Viewer"
    multipleSheets: boolean;
    sheetNames?: Array<string>;
    currSheetName?: string;
    tableData?: TableData;

    errorMessage: ErrorMessage;
}

@observer
class CombinedTable extends Component<{}, TableState> {
    private requestService: RequestService;
    private tableRef = React.createRef<HTMLTableElement>().current!;
    private selecting = false;
    private prevElement?: any; // We use any here, since the HTML element type hierarchy is too messy
    private prevDirection?: Direction;

    setTableReference(reference?: HTMLTableElement) {
        if (!reference) { return; }
        this.tableRef = reference;
    }

    constructor(props: {}) {
        super(props);

        this.requestService = new RequestService();

        // init state
        this.state = {
            // appearance
            showSpinner: wikiStore.table.showSpinner,
            showToast: false,

            // table data
            multipleSheets: false,
            errorMessage: {} as ErrorMessage,
        };

        this.handleOnKeyDown = this.handleOnKeyDown.bind(this);
        this.handleOnMouseUp = this.handleOnMouseUp.bind(this);
    }

    private disposers: IReactionDisposer[] = [];

    componentDidMount() {
        document.addEventListener('keydown', this.handleOnKeyDown);
        document.addEventListener('mouseup', this.handleOnMouseUp);
        this.disposers.push(reaction(() => currentFilesService.currentState.dataFile, () => this.updateProjectInfo()));
        this.disposers.push(reaction(() => wikiStore.table.showSpinner, (show) => this.setState({ showSpinner: show })));
        this.disposers.push(reaction(() => wikiStore.table.table, (table) => this.updateTableData(table)));
        this.disposers.push(reaction(() => wikiStore.layers, () => this.updateLayers()));
        this.disposers.push(reaction(() => wikiStore.annotations.blocks, () => this.setAnnotationColors()));
        this.disposers.push(reaction(() => wikiStore.table.selection, () => this.updateSelectionStyle()));
        this.disposers.push(reaction(() => wikiStore.table.selectedBlock, (block) => this.updateSelectedBlockStyle(block)));
        this.disposers.push(reaction(() => wikiStore.table.selectedCell, (cell) => this.updateSelectedCellStyle(cell)));

    }

    componentWillUnmount() {
        document.removeEventListener('keydown', this.handleOnKeyDown);
        document.removeEventListener('mouseup', this.handleOnMouseUp);
        for (const disposer of this.disposers) {
            disposer();
        }
    }


    getClasslessTableData(table?: TableDTO): TableData {
        if (!table) { table = wikiStore.table.table }
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
        return tableData;

    }

    updateTableData(table?: TableDTO) {
        if (!table || !table.cells) {
            this.setState({ tableData: undefined });
            return;
        }
        const tableData = this.getClasslessTableData(table);
        this.updateLayers(tableData);
    }

    updateLayers(tableData?: TableData) {
        if (!tableData) {
            tableData = this.getClasslessTableData()
        }

        const errors = wikiStore.layers.error;
        for (const entry of errors.entries) {
            for (const indexPair of entry.indices) {
                const tableCell = tableData[indexPair[0]][indexPair[1]];
                tableCell.classNames.push('error');
            }
        }

        if (currentFilesService.currentState.mappingType == "Yaml") {
            const types = wikiStore.layers.type;
            for (const entry of types.entries) {
                for (const indexPair of entry.indices) {
                    try {
                        const tableCell = tableData[indexPair[0]][indexPair[1]];
                        tableCell.classNames.push(`role-${entry.type}`);
                    }
                    catch {

                    }
                }
            }
        }

        else { this.setAnnotationColors(tableData) }

        const qnodes = wikiStore.layers.qnode;
        for (const entry of qnodes.entries) {
            for (const indexPair of entry.indices) {
                try {
                    const tableCell = tableData[indexPair[0]][indexPair[1]];
                    tableCell.classNames.push(`type-wikibaseitem`);
                }
                catch {
                    //pass
                }
            }
        }

        this.setState({ tableData });
    }

    setAnnotationColors(tableData?: TableData) {
        if (!tableData) {
            if (!this.state.tableData) {
                return;
            }
            const tableData = { ...this.state.tableData }
            //if we're taking existing table data, gotta clean it:
            tableData.forEach(row => {
                row.forEach(cell => {
                    cell.classNames = cell.classNames.filter(function (value, index, arr) {
                        return !value.startsWith("role-")
                    })
                })
            })
        }

        if (wikiStore.annotations.blocks && tableData) {
            for (const block of wikiStore.annotations.blocks) {
                const { role, type, selection, property, links, subject, link } = block;
                const classNames: string[] = [];
                if (role) {
                    if ((role == "qualifier") && !property && !links?.property) {
                        classNames.push(`role-${role}-no-property`);
                    } else if (role == "dependentVar" && ((!property && !links?.property) || (!subject && !links?.mainSubject))) {
                        classNames.push(`role-${role}-no-property`);
                    } else if ((role == "unit" || role == "mainSubject" || role == "property") && !link) {
                        classNames.push(`role-${role}-no-link`);
                    }
                    else {
                        classNames.push(`role-${role}`);
                    }
                }
                //TODO: set to "needs wikification"?
                //if (type=="wikibaseitem") {
                //  classNames.push(`type-${type}`);
                //}


                const { x1, y1, x2, y2 } = selection;
                const leftCol = Math.min(x1, x2) - 1;
                const rightCol = Math.max(x1, x2);
                const topRow = Math.min(y1, y2) - 1;
                const bottomRow = Math.max(y1, y2);
                let rowIndex = topRow;
                while (rowIndex < bottomRow) {
                    let colIndex = leftCol;
                    while (colIndex < rightCol) {
                        try {
                            const tableCell = tableData[rowIndex][colIndex];
                            tableCell.classNames.push(...classNames);
                        }
                        catch {
                            //TODO: handle annotating imaginary cells
                        }
                        colIndex += 1;
                    }
                    rowIndex += 1;
                }
            }
        }
    }

    updateSelectedBlockStyle(selectedBlock?: AnnotationBlock) {
        if (!selectedBlock){return;}
        const table: any = this.tableRef;
        if (!table) { return; }
        if (!wikiStore.table.selection) {
            console.warn("updateSelections should probably not be called without an existing selection");
            // If this warning shows up, you need to figure out whether it is actually OK for this function
            // to be called without an existing selection. If it is, remove the warning.
            return;
        }
        // Reset selections before update
        this.resetSelection();
        table.classList.add('active');

        const classNames: string[] = ['active'];
        const linksBlocks: { block: AnnotationBlock, classNames: string[] }[] = [];
        if (selectedBlock) {
            const { role, property, links, subject, link } = selectedBlock;
            if (role) {
                if ((role == "qualifier") && !property && !links?.property) {
                    classNames.push(`role-${role}-no-property`);
                } else if (role == "dependentVar" && ((!property && !links?.property) || (!subject && !links?.mainSubject))) {
                    classNames.push(`role-${role}-no-property`);
                } else if ((role == "unit" || role == "mainSubject" || role == "property") && !link) {
                    classNames.push(`role-${role}-no-link`);
                }
                {
                    classNames.push(`role-${role}`);
                }
            }
            if (links) {
                for (const block of wikiStore.annotations.blocks) {
                    if ((links.property && block.id == links.property) || (links.mainSubject && block.id == links.mainSubject)
                        || (links.unit && block.id == links.unit)) {
                        const linkedBlock = { ...block };
                        linksBlocks.push({ classNames: ['linked', `role-${linkedBlock.role}`], block: linkedBlock })
                    }
                }
            }
            if (link) {
                for (const block of wikiStore.annotations.blocks) {
                    if (block.id == link) {
                        const linkedBlock = { ...block };
                        linksBlocks.push({ classNames: ['linked', `role-${linkedBlock.role}`], block: linkedBlock })
                    }
                }
            }
        }
        this.selectBlock(wikiStore.table.selection, table, classNames);
        for (const linkedBlock of linksBlocks) {
            const { selection } = linkedBlock.block;
            this.selectBlock(selection, table, linkedBlock.classNames);
        }
    }

    selectBlock(selection: CellSelection, table: any, classNames: string[]) {
        const { x1, x2, y1, y2 } = selection;
        const rows = table.querySelectorAll('tr');
        const leftCol = Math.min(x1, x2);
        const rightCol = Math.max(x1, x2);
        const topRow = Math.min(y1, y2);
        const bottomRow = Math.max(y1, y2);
        let rowIndex = topRow;
        while (rowIndex <= bottomRow) {
            let colIndex = leftCol;
            while (colIndex <= rightCol) {
                this.selectCellBlock(
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

    selectCellBlock(cell: Element, rowIndex: number, colIndex: number, topRow: number, leftCol: number, rightCol: number, bottomRow: number, classNames: string[] = []) {
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
        if (classNames.includes('active')) {
            if (rowIndex === bottomRow && colIndex === rightCol) {
                const resizeCorner = document.createElement('div');
                resizeCorner.classList.add('cell-resize-corner');
                cell.appendChild(resizeCorner);
            }
        }
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

    updateSelectedCellStyle(selectedCell?: Cell) {
        if (!selectedCell){return;}
        // Get a reference to the table elements
        const table: any = this.tableRef;
        if (!table) { return; }
        const rows = table!.querySelectorAll('tr');
        const statement = wikiStore.layers.statement.find(selectedCell);

        let tableCell=rows[selectedCell.row+1].children[selectedCell.col+1]
        this.selectCell(tableCell, [])

        //select related cells
        if (statement && statement.cells) {
            // Select qualifier cells
            if ('qualifiers' in statement.cells) {
                statement.cells.qualifiers.forEach((cell: any) => {
                    for (const key in cell) {
                        const y = cell[key][0];
                        const x = cell[key][1];
                        tableCell = rows[y + 1].children[x + 1];
                        this.selectCell(tableCell, []);
                    }
                });
            }

            for (const key in statement.cells) {
                if (key === 'qualifiers') { continue; }
                const y = statement.cells[key][0];
                const x = statement.cells[key][1];
                tableCell = rows[y + 1].children[x + 1];
                this.selectCell(tableCell, []);
            }
        }

    }

    updateSelectionStyle() {

    }

    async addFile(file: File) {
        this.setState({
            errorMessage: {} as ErrorMessage,
            showToast: false,
            selectedCell: undefined,
        });
        console.log(file)

        // before sending request
        wikiStore.table.showSpinner = true;
        wikiStore.wikifier.showSpinner = true;

        // send request
        console.log("<TableComponent> -> %c/upload_data_file%c for table file: %c" + file.name, LOG.link, LOG.default, LOG.highlight);
        const data = { "filepath": file.path };
        try {
            await this.requestService.call(this, () => this.requestService.uploadDataFile(wikiStore.projects.current!.folder, data));
            console.log("<TableComponent> <- %c/upload_data_file%c with:", LOG.link, LOG.default);

            //update in files state
            currentFilesService.changeDataFile(file.name);

        } catch (error) {
            error.errorDescription += "\n\nCannot open file!";
            this.setState({ errorMessage: error });
        } finally {
            wikiStore.table.showSpinner = false;
            wikiStore.wikifier.showSpinner = false;
        }
    }

    async onDrop(files: File[]) {
        // get table file
        const file = files[0]
        await this.addFile(file)
    }

    async handleOpenTableFile(event: ChangeEvent) {
        // get table file
        const file = (event.target as HTMLInputElement).files![0];
        if (!file) { return; }
        this.addFile(file)
    }

    async handleSelectSheet(event: React.MouseEvent) {
        this.setState({
            errorMessage: {} as ErrorMessage,
            showToast: false,
            selectedCell: undefined,
        });

        const sheetName = (event.target as HTMLInputElement).innerHTML;
        await wikiStore.yaml.saveYaml();
        // remove current status
        wikiStore.yaml.yamlContent = '';
        wikiStore.output.isDownloadDisabled = true;

        // before sending request
        wikiStore.table.showSpinner = true;

        // send request
        console.log("<TableComponent> -> %c/change_sheet%c for sheet: %c" + sheetName, LOG.link, LOG.default, LOG.highlight);
        try {
            // await this.requestService.changeSheet(wikiStore.projects.current!.folder, sheetName);
            currentFilesService.changeSheet(sheetName, currentFilesService.currentState.dataFile);
            await this.requestService.getTable();
            if (wikiStore.yaml.yamlContent) {
                wikiStore.output.isDownloadDisabled = false;
            }
        } catch (error) {
            error.errorDescription += "\n\nCannot change sheet!";
            this.setState({ errorMessage: error });
        }
        wikiStore.wikifier.showSpinner = true;
        try {
            await this.requestService.getPartialCsv();
        }
        finally {
            wikiStore.wikifier.showSpinner = false;
        }
        wikiStore.table.showSpinner = false;

    }

    updateProjectInfo() {
        if (wikiStore.project.projectDTO) {
            const project = wikiStore.project.projectDTO;
            const filename = currentFilesService.currentState.dataFile;
            let multipleSheets = false;
            let sheetNames = [] as string[];
            let currSheetName = '';
            if (project.data_files[filename] && currentFilesService.currentState.sheetName) { // If there are datafile and sheet name (not a new project)
                sheetNames = project.data_files[filename].val_arr;
                currSheetName = currentFilesService.currentState.sheetName;
                multipleSheets = sheetNames && sheetNames.length > 1;
            }

            this.setState({ filename, sheetNames, currSheetName, multipleSheets });
        }

        { this.createAnnotationIfDoesNotExist(); }
    }


    async createAnnotationIfDoesNotExist() {
        if (!currentFilesService.currentState.dataFile) { return; }
        if (!currentFilesService.currentState.mappingFile) {
            //create a mapping file
            const title = path.join("annotations", path.parse(currentFilesService.currentState.dataFile).name + "-" + currentFilesService.currentState.sheetName + ".annotation");
            const data = {
                "title": title,
                "sheetName": currentFilesService.currentState.sheetName,
                "dataFile": currentFilesService.currentState.dataFile
            };

            await this.requestService.createAnnotation(data)
            currentFilesService.changeAnnotation(title, currentFilesService.currentState.sheetName, currentFilesService.currentState.dataFile);
        }
    }

    async getAnnotationSuggestedBlocks() {
        if (wikiStore.annotations.blocks.length > 0) {
            if (!confirm("This will clear the existing annotation, are you sure you want to continue?")) {
                return;
            }
        }
        wikiStore.table.showSpinner = true;
        wikiStore.yaml.showSpinner = true;
        try {
            await this.requestService.call(this, () => this.requestService.getSuggestedAnnotationBlocks())
        } finally {
            wikiStore.yaml.showSpinner = false;
        }

        let data = {} as any;
        let hasSubject = false;
        for (const block of wikiStore.annotations.blocks) {
            if (block.role == "mainSubject") {
                hasSubject = true;
                data = { "selection": block.selection };
            }
        }

        if (hasSubject)
            try {
                await this.requestService.call(this, () => this.requestService.callCountryWikifier(data))
            } finally {
                //
            }
        wikiStore.table.showSpinner = false;
        wikiStore.wikifier.showSpinner = true;
        try {
            await this.requestService.getPartialCsv();
        }
        finally {
            wikiStore.wikifier.showSpinner = false;
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
            table.querySelectorAll('td[class*="linked"]').forEach(e => {
                e.classList.forEach(className => {
                    if (className.startsWith('linked')) {
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

    checkOverlaps() {
        if (!wikiStore.table.selection) { return; }
        const { x1, y1, x2, y2 } = wikiStore.table.selection;

        // Get the coordinates of the sides
        const aTop = y1 <= y2 ? y1 : y2;
        const aLeft = x1 <= x2 ? x1 : x2;
        const aRight = x2 >= x1 ? x2 : x1;
        const aBottom = y2 >= y1 ? y2 : y1;

        const { blocks } = wikiStore.annotations;
        for (let i = 0; i < blocks.length; i++) {
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
        //todo
        this.selecting = false;
    }

    handleOnMouseDown(event: React.MouseEvent) {
        const element = event.target as any;

        // Allow users to select the resize-corner of the cell
        if (element.className === 'cell-resize-corner') {
            this.prevElement = element.parentElement;
            this.selecting = true;
            return;
        } else if (element.nodeName !== 'TD') { return; }


        // get coordinates
        const x: number = element.cellIndex;
        const y: number = element.parentElement.rowIndex;

        wikiStore.table.selectedCell = new Cell(x - 1, y - 1);

        // check if the user is selecting an annotation block
        const selectedBlock = checkSelectedAnnotationBlocks({ x1: x, y1: y, x2: x, y2: y });
        if (selectedBlock) {
            wikiStore.table.selectedBlock = selectedBlock;
            wikiStore.table.selection = selectedBlock.selection;
        }

        else {
            // Activate the selection mode
            this.selecting = true;
            const x1 = x, x2 = x, y1 = y, y2 = y;
            const selection = wikiStore.table.selection;

            // Extend the previous selection if user is holding down Shift key
            if (event.shiftKey && selection) {

                // Extend the previous selection left or right
                if (x1 !== selection['x1']) {
                    if (x1 < selection['x1']) {
                        selection['x1'] = x1;
                    } else {
                        selection['x2'] = x1;
                    }
                }

                // Extend the previous selection up or down
                if (y1 !== selection['y1']) {
                    if (y1 < selection['y1']) {
                        selection['y1'] = y1;
                    } else {
                        selection['y2'] = y1;
                    }
                }

                wikiStore.table.selection = selection;
            } else {
                wikiStore.table.selection = { x1, x2, y1, y2 };
            };
        }

        // Initialize the previous element with the one selected
        this.prevElement = element;
    }


    handleOnMouseMove(event: React.MouseEvent) {
        const selectedAnnotationBlock = wikiStore.table.selectedBlock;
        const element = event.target as any;
        if (element === this.prevElement) { return; }

        // Don't allow out-of-bounds resizing
        if (element.nodeName !== 'TD') {
            return;
        }

        if (this.selecting && !event.shiftKey) {
            const selection = wikiStore.table.selection;
            if (!selection) { return; }

            // Update the last x coordinate of the selection
            const newCellIndex = element.cellIndex;
            selection.x2 = newCellIndex;

            // Update the last y coordinate of the selection
            const newRowIndex = element.parentElement.rowIndex;
            selection.y2 = newRowIndex;

            wikiStore.table.selection = selection

            // Update reference to the previous element
            this.prevElement = element;
        }
    }

    handleOnKeyDown(event: KeyboardEvent) {

        // remove selections
        if (event.code === 'Escape') {
            wikiStore.table.selectedCell = undefined;
            wikiStore.table.selectedBlock = undefined;
            wikiStore.table.selection = undefined;
            return;
        }

        const arrowCodes = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
        if (arrowCodes.includes(event.code)) {

            // Don't allow moving around when users are typing
            if ((event.target as any).nodeName === 'INPUT') { return; }

            // Don't allow moving around when selecting from the dropdown menu
            if ((event.target as any).nodeName === 'SELECT') { return; }


            event.preventDefault();
            const table: any = this.tableRef;
            const rows = table!.querySelectorAll('tr');
            if (wikiStore.table.selectedCell) {
                let { row, col } = wikiStore.table.selectedCell;

                // arrow up
                if (event.code === 'ArrowUp') {
                    if (row > 0) {
                        row = row - 1;
                    }
                }

                // arrow down
                if (event.code === 'ArrowDown') {
                    if (row < rows.length) { row = row + 1; }
                }

                // arrow left
                if (event.code === 'ArrowLeft') {
                    if (col > 0) { col = col - 1; }
                }

                // arrow right
                if (event.code === 'ArrowRight') {
                    if (col < rows[row].children.length) { col = col + 1; }
                }

                wikiStore.table.selectedCell = new Cell(col, row);


                if (event.shiftKey) {
                    let selection = wikiStore.table.selection;
                    if (selection) {
                        const { x1, x2, y1, y2 } = selection;
                        if (event.code === 'ArrowUp' && y1 > 1) {
                            const nextElement = rows[y1 - 1].children[x1];
                            if (y1 === y2) {
                                selection = { 'x1': x1, 'x2': x2, 'y1': y1 - 1, 'y2': y2 };
                                this.prevDirection = 'up';
                            } else {
                                if (this.prevDirection === 'down') {
                                    selection = { 'x1': x1, 'x2': x2, 'y1': y1, 'y2': y2 - 1 };
                                } else {
                                    selection = { 'x1': x1, 'x2': x2, 'y1': y1 - 1, 'y2': y2 };
                                    this.prevDirection = 'up';
                                }
                            }
                            this.prevElement = nextElement;
                        }

                        if (event.code === 'ArrowDown' && y1 < rows.length - 1) {
                            const nextElement = rows[y1 + 1].children[x1];
                            if (y1 === y2) {
                                selection = { 'x1': x1, 'x2': x2, 'y1': y1, 'y2': y2 + 1 };
                                this.prevDirection = 'down';
                            } else {
                                if (this.prevDirection === 'up') {
                                    selection = { 'x1': x1, 'x2': x2, 'y1': y1 + 1, 'y2': y2 };
                                } else {
                                    selection = { 'x1': x1, 'x2': x2, 'y1': y1, 'y2': y2 + 1 };
                                    this.prevDirection = 'down';
                                }
                            }
                            this.prevElement = nextElement;
                        }

                        if (event.code === 'ArrowLeft' && x1 > 1) {
                            const nextElement = rows[y1].children[x1 - 1];
                            if (x1 === x2) {
                                selection = { 'x1': x1 - 1, 'x2': x2, 'y1': y1, 'y2': y2 };
                                this.prevDirection = 'left';
                            } else {
                                if (this.prevDirection === 'right') {
                                    selection = { 'x1': x1, 'x2': x2 - 1, 'y1': y1, 'y2': y2 };
                                } else {
                                    selection = { 'x1': x1 - 1, 'x2': x2, 'y1': y1, 'y2': y2 };
                                    this.prevDirection = 'left';
                                }
                            }
                            this.prevElement = nextElement;
                        }
                        if (event.code === 'ArrowRight' && x1 < rows[y1].children.length - 1) {
                            const nextElement = rows[y1].children[x1 + 1];
                            if (x1 === x2) {
                                selection = { 'x1': x1, 'x2': x2 + 1, 'y1': y1, 'y2': y2 };
                                this.prevDirection = 'right';
                            } else {
                                if (this.prevDirection === 'left') {
                                    selection = { 'x1': x1 + 1, 'x2': x2, 'y1': y1, 'y2': y2 };
                                } else {
                                    selection = { 'x1': x1, 'x2': x2 + 1, 'y1': y1, 'y2': y2 };
                                    this.prevDirection = 'right';
                                }
                            }
                            this.prevElement = nextElement;
                        }
                        wikiStore.table.selection = selection
                    }
                }
                else { //moved arrow potentially into new block;
                    const selectedBlock = checkSelectedAnnotationBlocks({ x1: col + 1, y1: row + 1, x2: col + 1, y2: row + 1 });
                    wikiStore.table.selectedBlock = selectedBlock;
                    wikiStore.table.selection = selectedBlock?.selection || undefined;
                }
            }
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

    renderErrorMessage() {
        const { errorMessage } = this.state;
        if (errorMessage.errorDescription) {
            return (
                <ToastMessage message={this.state.errorMessage} />
            )
        }
    }

    renderTitle() {
        const { filename } = this.state;
        return (
            <div style={{ width: "calc(100% - 500px)", cursor: "default" }}
                className="text-white font-weight-bold d-inline-block text-truncate">
                { filename ? (
                    <span>
                        {filename}
                        <span style={{ opacity: "0.5", paddingLeft: "5px" }}>
                            [Read-Only]
            </span>
                    </span>
                ) : (
                    <span>Table&nbsp;Viewer</span>
                )}
            </div>
        )
    }

    renderSuggestButton() {
        if (currentFilesService.currentState.mappingType != "Yaml") {
            return (
                <div style={{ cursor: "pointer", textDecoration: "underline" }}
                    className="text-white d-inline-block">
                    <span onClick={() => this.getAnnotationSuggestedBlocks()}>Suggest annotation</span>
                </div>
            )
        }
    }

    renderUploadTooltip() {
        return (
            <Tooltip style={{ width: "fit-content" }} id="upload">
                <div className="text-left small">
                    <b>Accepted file types:</b><br />
          • Comma-Separated Values (.csv)<br />
          • Tab-Separated Values (.tsv)<br />
          • Microsoft Excel (.xls/.xlsx)
        </div>
            </Tooltip>
        )
    }

    renderUploadButton() {
        return (
            <React.Fragment>
                <OverlayTrigger
                    placement="bottom"
                    trigger={["hover", "focus"]}
                    overlay={this.renderUploadTooltip()}>
                    <Button size="sm"
                        className="d-inline-block float-right py-0 px-2"
                        variant="outline-light"
                        onClick={() => document.getElementById("file_table")?.click()}>
                        Upload data file
          </Button>
                </OverlayTrigger>

                {/* hidden input of table file */}
                <input
                    type="file"
                    id="file_table"
                    accept=".csv, .tsv, .xls, .xlsx"
                    style={{ display: "none" }}
                    onChange={this.handleOpenTableFile.bind(this)}
                    onClick={(event) => (event.target as HTMLInputElement).value = ''}
                />
            </React.Fragment>
        )
    }

    renderLoading() {
        return (
            <div className="mySpinner" hidden={!this.state.showSpinner}>
                <Spinner animation="border" />
            </div>
        )
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

    renderLegend() {
        const { multipleSheets } = this.state;
        return (
            <TableLegend offset={multipleSheets} />
        )
    }

    renderSheetSelector() {
        const { currSheetName, sheetNames } = this.state;
        return (
            <SheetSelector
                sheetNames={sheetNames}
                currSheetName={currSheetName}
                disabled={wikiStore.yaml.showSpinner}
                handleSelectSheet={(event) => this.handleSelectSheet(event)} />
        )
    }

    render() {
        const { multipleSheets } = this.state;

        return (
            <div className="w-100 h-100 p-1">

                {this.renderErrorMessage()}

                <Card className="w-100 h-100 shadow-sm">

                    <Card.Header className={"py-2 px-3"}
                        style={{ height: "40px", background: "#339966" }}>
                        {this.renderTitle()}
                        {this.renderUploadButton()}
                        {this.renderSuggestButton()}
                    </Card.Header>

                    <Card.Body className="ag-theme-balham w-100 h-100 p-0">
                        {this.renderLoading()}
                        {this.renderTable()}
                        {this.renderLegend()}
                    </Card.Body>

                    <Card.Footer hidden={!multipleSheets} className={'p-0'}>
                        {this.renderSheetSelector()}
                    </Card.Footer>

                </Card>
            </div>
        )
    }
}

export default CombinedTable;
