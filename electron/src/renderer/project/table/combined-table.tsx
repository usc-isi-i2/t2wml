///header, footer (with sheet switcher), switcher between different table components

import React, { ChangeEvent, Component } from 'react';
import * as path from 'path';
import './drop-container.css';
import Dropzone from 'react-dropzone';
import { Button, Card, OverlayTrigger, Spinner, Tooltip } from 'react-bootstrap';

import { AnnotationBlock, QNode, TableCell, TableData, TableDTO } from '../../common/dtos';
import { LOG, ErrorMessage, Cell, CellSelection } from '../../common/general';
import RequestService from '../../common/service';
import SheetSelector from '../sheet-selector/sheet-selector';
import ToastMessage from '../../common/toast';
import TableLegend from './table-legend';

import { checkSelectedAnnotationBlocks } from './table-utils';
import { observer } from 'mobx-react';
import wikiStore from '../../data/store';
import { IReactionDisposer, reaction } from 'mobx';
import { currentFilesService } from '../../common/current-file-service';
import Table, { DEFAULT_CELL_STATE } from './table';

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

    rowCount: number;
    loadedRows: { [indexRow: number]: boolean }
}


@observer
class CombinedTable extends Component<{}, TableState> {
    private requestService: RequestService;

    private selecting = false;
    private prevElement?: any; // We use any here, since the HTML element type hierarchy is too messy
    private prevDirection?: Direction;
    private penddingRowTimeout?: number;

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
            rowCount: 0,
            loadedRows: {}
        };

        this.handleOnKeyDown = this.handleOnKeyDown.bind(this);
        this.handleOnMouseUp = this.handleOnMouseUp.bind(this);
    }

    private disposers: IReactionDisposer[] = [];

    componentDidMount() {
        document.addEventListener('keydown', this.handleOnKeyDown);
        document.addEventListener('mouseup', this.handleOnMouseUp);
        this.disposers.push(reaction(() => currentFilesService.currentState.dataFile, () => this.updateProjectInfo()));
        this.disposers.push(reaction(() => currentFilesService.currentState.sheetName, () => this.updateProjectInfo()));
        this.disposers.push(reaction(() => wikiStore.table.showSpinner, (show) => this.setState({ showSpinner: show })));
        this.disposers.push(reaction(() => wikiStore.table.table, (table) => this.updateTableData(table)));
        this.disposers.push(reaction(() => wikiStore.layers.qnode, () => this.updateQnode()));
        this.disposers.push(reaction(() => wikiStore.layers.statement, () => this.updateStatement()));
        this.disposers.push(reaction(() => wikiStore.annotations.blocks, () => this.setAnnotationColors()));
        this.disposers.push(reaction(() => wikiStore.table.selection, (selection) => this.updateSelectionStyle(selection)));
        this.disposers.push(reaction(() => wikiStore.table.selectedCell, (cell) => this.updateActiveCellStyle(cell)));
        this.disposers.push(reaction(() => wikiStore.table.selectedBlock, (block) => { wikiStore.table.selection = block?.selection }));
        this.disposers.push(reaction(() => wikiStore.table.showQnodes, (showQnode) => this.updateQnodeCells(showQnode)));
    }

    componentWillUnmount() {
        document.removeEventListener('keydown', this.handleOnKeyDown);
        document.removeEventListener('mouseup', this.handleOnMouseUp);
        for (const disposer of this.disposers) {
            disposer();
        }
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
    }

    async createAnnotationIfDoesNotExist() {
        if (!currentFilesService.currentState.dataFile) { return; }
        if (!currentFilesService.currentState.mappingFile) {
            //create a mapping file - needs to be forward slash so title matches whats returned from backend
            const title = "annotations" + "/" + path.parse(currentFilesService.currentState.dataFile).name + "-" + currentFilesService.currentState.sheetName + ".annotation";
            const data = {
                "title": title,
                "sheetName": currentFilesService.currentState.sheetName,
                "dataFile": currentFilesService.currentState.dataFile
            };

            await this.requestService.createAnnotation(data)
            currentFilesService.changeAnnotation(title, currentFilesService.currentState.sheetName, currentFilesService.currentState.dataFile);
        }
    }

    getQnodeCellContent(qnode: QNode, rawContent?: string) {
        return (
            <span className="qnode-cell-content">
                {rawContent}
                <br />
                <strong className="qnode-cell-content">{qnode.label}</strong> ({qnode.url ? (
                    <a target="_blank"
                        rel="noopener noreferrer"
                        className="qnode-cell-content type-qnode"
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

    updateQnodeCells(showQnode: boolean, tableData?: TableData) {
        if (!tableData) {
            if (!this.state.tableData) {
                return;
            }
            const { tableData: tableDataState } = this.state;
            tableData = tableDataState
        }

        const qnodes = wikiStore.layers.qnode;

        //clear any existing qnode coloration

        tableData = this.removeClassNameFromTableData(tableData, 'type-qNode')

        if (showQnode) {
            for (const entry of qnodes.entries) {
                for (const indexPair of entry.indices) {
                    const tableCell = tableData[indexPair[0]][indexPair[1]];
                    tableCell.content = this.getQnodeCellContent(entry, tableCell.rawContent);
                    tableCell.classNames.push('type-qNode');
                }
            }
        } else {
            for (const entry of qnodes.entries) {
                for (const indexPair of entry.indices) {
                    const tableCell = tableData[indexPair[0]][indexPair[1]];
                    tableCell.content = tableCell.rawContent || '';
                }
            }
        }
        console.log("1 setState data");
        this.setState({ tableData });
    }


    getClasslessTableData(table?: TableDTO): TableData {
        if (!table) { table = wikiStore.table.table }
        const tableData = [];
        for (let i = 0; i < table.cells.length; i++) {
            const rowData = [];
            for (let j = 0; j < table.cells[i].length; j++) {
                const cell: TableCell = {
                    content: table.cells[i][j],
                    rawContent: table.cells[i][j],
                    classNames: [],
                    ...DEFAULT_CELL_STATE
                };
                rowData.push(cell);
            }
            tableData.push(rowData);
        }
        return tableData;
    }

    updateTableData(table?: TableDTO) {
        const { loadedRows } = this.state;
        wikiStore.table.resetSelections();
        if (!table || !table.cells) {
            this.setState({ tableData: undefined, rowCount: 0, loadedRows: {} });
            return;
        }
        const tableData = this.getClasslessTableData(table);
        for (let indexRow = 0; indexRow < Object.keys(tableData).length; indexRow++) {
            loadedRows[indexRow] = true;
        }
        console.log("2 setState data");
        this.setState({ tableData, rowCount: table.dims[0], loadedRows })
        { this.createAnnotationIfDoesNotExist(); }
    }


    updateStatement(tableData?: TableData) {
        if (!tableData) {
            if (!this.state.tableData) {
                return;
            }
            const { tableData: tableDataTmp } = this.state;
            tableData = tableDataTmp;
            //if we're taking existing table data, gotta clean it:
            try {
                for (let indexRow = 0; indexRow < Object.keys(tableData).length; indexRow++) {
                    if (tableData[indexRow]) {
                        for (let indexCol = 0; indexCol < tableData[indexRow].length; indexCol++) {
                            tableData[indexRow][indexCol].classNames = tableData[indexRow][indexCol].classNames.filter((value) =>
                                !value.startsWith("error")
                            )
                        }
                    }
                }
            } catch (error) {
                console.log(error);
            }
        }

        this.setAnnotationColors(tableData)

        for (const rowIndex of Object.keys(tableData)) {
            for (const colIndex of Object.keys(tableData[+rowIndex])) {
                tableData[+rowIndex][+colIndex].overlay = undefined;
            }
        }

        const errors = wikiStore.layers.error;
        for (const entry of errors.entries) {
            for (const indexPair of entry.indices) {
                tableData[indexPair[0]][indexPair[1]].classNames.push('error');
                let errMsg = ""
                for (const err of entry.error) {
                    errMsg += err.message
                    errMsg += ","
                }
                errMsg = errMsg.slice(0, -1) //get rid of last comma
                tableData[indexPair[0]][indexPair[1]].overlay = errMsg;
            }
        }

        this.updateQnode(tableData);
    }

    updateQnode(tableData?: TableData) {
        if (!tableData) {
            if (!this.state.tableData) {
                return;
            }
            const { tableData: tableDataTmp } = this.state;
            tableData = tableDataTmp;
            //if we're taking existing table data, gotta clean it:

            try {
                for (let indexRow = 0; indexRow < Object.keys(tableData).length; indexRow++) {
                    if (tableData[indexRow]) {
                        for (let indexCol = 0; indexCol < tableData[indexRow].length; indexCol++) {
                            tableData[indexRow][indexCol].classNames = tableData[indexRow][indexCol].classNames.filter((value) =>
                                !value.startsWith("wikified")
                            )
                        }
                    }
                }
            } catch (error) {
                console.log(error);
            }
        }


        const qnodes = wikiStore.layers.qnode;
        for (const entry of qnodes.entries) {
            for (const indexPair of entry.indices) {
                try {
                    tableData[indexPair[0]][indexPair[1]].classNames.push(`wikified`);
                }
                catch {
                    //pass
                }
            }
        }
        this.updateQnodeCells(wikiStore.table.showQnodes, tableData);
    }

    setAnnotationColors(tableData?: TableData) {
        if (!tableData) {
            if (!this.state.tableData) {
                return;
            }
            const { tableData: tableDataTmp } = this.state;
            tableData = tableDataTmp;
            //if we're taking existing table data, gotta clean it:
            try {
                for (let indexRow = 0; indexRow < Object.keys(tableData).length; indexRow++) {
                    if (tableData[indexRow]) {
                        for (let indexCol = 0; indexCol < tableData[indexRow].length; indexCol++) {
                            tableData[indexRow][indexCol] = {
                                ...tableData[indexRow][indexCol],
                                ...DEFAULT_CELL_STATE,
                                classNames: tableData[indexRow][indexCol].classNames.filter((value) =>
                                    !value.startsWith("role-") && !value.startsWith("expects-wiki")
                                )
                            }
                        }
                    }
                }
            } catch (error) {
                console.log(error);
            }
        }

        if (currentFilesService.currentState.mappingType == "Yaml") {
            const types = wikiStore.layers.type;
            for (const entry of types.entries) {
                for (const indexPair of entry.indices) {
                    try {
                        const tableCell = tableData[indexPair[0]][indexPair[1]];
                        if (!tableCell.classNames.includes(`role-${entry.type}`)) {
                            tableCell.classNames.push(`role-${entry.type}`);
                        }
                    }
                    catch {
                        console.log("catch");
                    }
                }
            }
            return;
        }

        if (wikiStore.annotations.blocks && tableData) {
            for (const block of wikiStore.annotations.blocks) {
                const { role, selection, property, links, subject, link, type } = block;
                const classNames: string[] = [];
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

                    if (role == "unit" || role == "mainSubject" || role == "property") {
                        classNames.push("expects-wiki")
                    }
                }
                if (type == "wikibaseitem" && !classNames.includes("expects-wiki")) {
                    classNames.push("expects-wiki")
                }

                const { x1, y1, x2, y2 } = selection;
                const leftCol = Math.min(x1, x2) - 1;
                const rightCol = Math.max(x1, x2) - 1;
                const topRow = Math.min(y1, y2) - 1;
                const bottomRow = Math.max(y1, y2) - 1;
                let rowIndex = topRow;
                while (rowIndex <= bottomRow) {
                    let colIndex = leftCol;
                    while (colIndex <= rightCol) {
                        try {
                            const toAdd = {
                                wikified: tableData[rowIndex][colIndex].classNames.includes("wikified"),
                                error: tableData[rowIndex][colIndex].classNames.includes("error")
                            };
                            let classNameAll = classNames.slice();
                            if (toAdd.wikified) {
                                classNameAll = classNameAll.filter(cn => cn !== 'expects-wiki')
                                classNameAll.push('wikified')
                            }
                            if (toAdd.error) classNameAll.push('error')
                            tableData[rowIndex][colIndex] = {
                                ...tableData[rowIndex][colIndex],
                                ...DEFAULT_CELL_STATE,
                                classNames: classNameAll
                            }

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
        console.log("4 setState data");
        this.setState({ tableData })
    }

    applyCsstoBlock(tableData: TableData, selection: CellSelection, classNames: string[]) {
        const { x1, x2, y1, y2 } = selection;

        const leftCol = Math.min(x1, x2) - 1;
        const rightCol = Math.max(x1, x2) - 1;
        const topRow = Math.min(y1, y2) - 1;
        const bottomRow = Math.max(y1, y2) - 1;

        let rowIndex = topRow
        while (rowIndex <= bottomRow) {
            let colIndex = leftCol
            while (colIndex <= rightCol) {
                const cellData = tableData[rowIndex][colIndex]
                cellData.active = true

                cellData.activeTop = false
                cellData.activeLeft = false
                cellData.activeRight = false
                cellData.activeBottom = false
                cellData.activeCorner = false
                if (rowIndex === topRow) { cellData.activeTop = true; }
                if (colIndex === leftCol) { cellData.activeLeft = true; }
                if (colIndex === rightCol) { cellData.activeRight = true; }
                if (rowIndex === bottomRow) { cellData.activeBottom = true; }
                if (rowIndex === bottomRow && colIndex === rightCol) { cellData.activeCorner = true; }

                classNames.forEach(className => {
                    if (!cellData.classNames.includes(className)) {
                        cellData.classNames.push(className)
                    }
                });
                tableData[rowIndex][colIndex] = { ...cellData }

                colIndex += 1
            }
            rowIndex += 1
        }
        return tableData;
    }


    updateActiveCellStyle(selectedCell?: Cell) {
        // Get a reference to the table elements
        const { tableData: oldTableData } = this.state;
        if (!oldTableData) { return; }

        for (let indexRow = 0; indexRow < Object.keys(oldTableData).length; indexRow++) {
            if (oldTableData[indexRow]) {
                for (let indexCol = 0; indexCol < oldTableData[indexRow].length; indexCol++) {
                    oldTableData[indexRow][indexCol].highlight = false;
                }
            }
        }

        if (!selectedCell) { return; }

        let tableData = this.resetActiveCellCss(oldTableData)
        const statement = wikiStore.layers.statement.find(selectedCell);

        const activeCell = tableData[selectedCell.row][selectedCell.col]
        activeCell.highlight = true;
        activeCell.active = true;

        //select related cells
        if (statement && statement.cells) {
            // Select qualifier cells
            if ('qualifiers' in statement.cells) {
                statement.cells.qualifiers.forEach((cell: any) => {
                    for (const key in cell) {
                        const y = cell[key][0];
                        const x = cell[key][1];
                        const qualCell = tableData[y + 1][x + 1]
                        qualCell.classNames.push('linked-cell')
                    }
                });
            }

            for (const key in statement.cells) {
                if (key === 'qualifiers') { continue; }
                const y = statement.cells[key][0];
                const x = statement.cells[key][1];
                const keyCell = tableData[y + 1][x + 1];
                keyCell.classNames.push('linked-cell');
            }
        }

        if (currentFilesService.currentState.mappingType == "Yaml") { return; }

        const selectedBlock = checkSelectedAnnotationBlocks({
            x1: selectedCell.col + 1,
            y1: selectedCell.row + 1,
            x2: selectedCell.col + 1,
            y2: selectedCell.row + 1
        });

        if (selectedBlock != wikiStore.table.selectedBlock) {
            tableData = this.resetActiveBlockCss(tableData)
        }

        if (selectedBlock && selectedBlock != wikiStore.table.selectedBlock) {
            const classNames: string[] = [];
            const linksBlocks: { block: AnnotationBlock, classNames: string[] }[] = [];

            const { role, property, links, subject, link } = selectedBlock;
            if (role) {
                if ((role == "qualifier") && !property && !links?.property) {
                    classNames.push(`role-${role}-no-property`);
                } else if (role == "dependentVar" && ((!property && !links?.property) || (!subject && !links?.mainSubject))) {
                    classNames.push(`role-${role}-no-property`);
                } else if ((role == "unit" || role == "mainSubject" || role == "property") && !link) {
                    classNames.push(`role-${role}-no-link`);
                } else {
                    classNames.push(`role-${role}`);
                }
            }
            if (links) {
                for (const block of wikiStore.annotations.blocks) {
                    if ((links.property && block.id == links.property) || (links.mainSubject && block.id == links.mainSubject)
                        || (links.unit && block.id == links.unit)) {
                        const linkedBlock = { ...block };
                        linksBlocks.push({ classNames: ['linked-block', `role-${linkedBlock.role}`], block: linkedBlock })
                    }
                }
            }
            if (link) {
                for (const block of wikiStore.annotations.blocks) {
                    if (block.id == link) {
                        const linkedBlock = { ...block };
                        linksBlocks.push({ classNames: ['linked-block', `role-${linkedBlock.role}`], block: linkedBlock })
                    }
                }
            }

            tableData = this.applyCsstoBlock(tableData, selectedBlock.selection, classNames)

            for (const linkedBlock of linksBlocks) {
                const { selection } = linkedBlock.block;
                tableData = this.applyCsstoBlock(tableData, selection, linkedBlock.classNames);
            }
        }

        console.log("5 setState data");
        this.setState({ tableData });
    }

    updateSelectionStyle(selection?: CellSelection) {
        if (currentFilesService.currentState.mappingType == "Yaml") { return; }
        let { tableData } = this.state;
        if (!tableData) { return; }
        tableData = this.resetSelectionCss(tableData)
        if (!selection) { return }
        const classNames: string[] = [];
        tableData = this.applyCsstoBlock(tableData, selection, classNames);
        console.log("6 setState data");
        this.setState({ tableData })
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
        wikiStore.partialCsv.showSpinner = true;
        try {
            await this.requestService.getPartialCsv();
        }
        finally {
            wikiStore.partialCsv.showSpinner = false;
        }
    }

    async addFiles(files: File[]) {
        this.setState({
            errorMessage: {} as ErrorMessage,
            showToast: false,
        });
        console.log(files)
        if (!files.length) { return; }

        // before sending request
        wikiStore.table.showSpinner = true;
        wikiStore.partialCsv.showSpinner = true;

        // send request
        try {
            for (const file of files) {
                console.log("<TableComponent> -> %c/upload_data_file%c for table file: %c" + file.name, LOG.link, LOG.default, LOG.highlight);
                const data = { "filepath": file.path };
                await this.requestService.call(this, () => this.requestService.uploadDataFile(wikiStore.projects.current!.folder, data));
                console.log("<TableComponent> <- %c/upload_data_file%c with:", LOG.link, LOG.default);
            }
        } catch (error) {
            error.errorDescription += "\n\nCannot load one of the files: " + files.map(file => file.name).join(', ');
            this.setState({ errorMessage: error });
        }

        try {
            currentFilesService.changeDataFile(files[0].name);
        } catch (error) {
            error.errorDescription += "\n\nCannot open file " + files[0].name;
            this.setState({ errorMessage: error });
        } finally {
            wikiStore.table.showSpinner = false;
            wikiStore.partialCsv.showSpinner = false;
        }
    }

    async onDrop(files: File[]) {
        // get table file
        await this.addFiles(files)
    }

    async handleOpenTableFile(event: ChangeEvent) {
        // get table file
        const file = (event.target as HTMLInputElement).files![0];
        if (!file) { return; }
        this.addFiles([file]) // send the file into a list
    }

    async handleSelectSheet(event: React.MouseEvent) {
        this.setState({
            errorMessage: {} as ErrorMessage,
            showToast: false
        });
        console.log("resetting wikistore selections from handle select sheet")
        wikiStore.table.resetSelections();

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
        wikiStore.partialCsv.showSpinner = true;
        try {
            await this.requestService.getPartialCsv();
        }
        finally {
            wikiStore.partialCsv.showSpinner = false;
        }
        wikiStore.table.showSpinner = false;

    }

    removeClassNameFromTableData(tableData: TableData, classNameToDelete?: string): TableData {
        if (classNameToDelete) {
            for (let indexRow = 0; indexRow < Object.keys(tableData).length; indexRow++) {
                if (tableData[indexRow]) {
                    for (let indexCol = 0; indexCol < tableData[indexRow].length; indexCol++) {
                        const cell = tableData[indexRow][indexCol]
                        tableData[indexRow][indexCol] = {
                            ...cell,
                            classNames: cell.classNames.filter(className => className !== classNameToDelete)
                        }
                    }
                }

            }
        }
        return tableData;
    }

    resetSelectionCss(tableData: TableData) {
        for (let indexRow = 0; indexRow < Object.keys(tableData).length; indexRow++) {
            if (tableData[indexRow]) {
                for (let indexCol = 0; indexCol < tableData[indexRow].length; indexCol++) {
                    tableData[indexRow][indexCol] = {
                        ...tableData[indexRow][indexCol],
                        ...DEFAULT_CELL_STATE
                    }
                }
            }
        }
        return tableData;
    }

    resetActiveBlockCss(tableData: TableData) {
        tableData = this.removeClassNameFromTableData(tableData, 'linked-block');
        for (let indexRow = 0; indexRow < Object.keys(tableData).length; indexRow++) {
            if (tableData[indexRow]) {
                for (let indexCol = 0; indexCol < tableData[indexRow].length; indexCol++) {
                    tableData[indexRow][indexCol] = {
                        ...tableData[indexRow][indexCol],
                        ...DEFAULT_CELL_STATE
                    }
                }
            }
        }
        return tableData;
    }

    resetActiveCellCss(tableData: TableData) {
        tableData = this.removeClassNameFromTableData(tableData, 'linked-cell')

        return tableData
    }

    checkOverlaps(selection?: CellSelection) {
        if (!selection) { return; }
        const { x1, y1, x2, y2 } = selection;

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
            return blocks[i];
        }

        // no collisions detected
        return undefined;
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
        }
        // else if (element.className !== "ReactVirtualized__Table__rowColumn") {
        //     // if the "show qnode" is selecting in the menu.
        //     if (element.className.startsWith("cell-div")) {
        //         let count = 4
        //         while (element.className !== "ReactVirtualized__Table__rowColumn" && count && element.parentNode) {
        //             element = element.parentNode
        //             count -= 1
        //         }
        //         if (element.className !== "ReactVirtualized__Table__rowColumn") return;

        //     } else { return; }
        // }

        // if (!element.className.startsWith("cell-div")) {
        //     // if the "show qnode" is selecting in the menu.
        //     if (element.className.startsWith("qnode-cell-content")) {
        //         let count = 4
        //         while (!element.className.startsWith("cell") && count && element.parentNode) {
        //             element = element.parentNode
        //             count -= 1
        //         }
        //         if (!element.className.startsWith("cell")) { return; }

        //     } else { return; }
        // }


        // get coordinates
        const x: number = parseInt(element.dataset.colIndex);
        const y: number = parseInt(element.dataset.rowIndex);
        if (!x || !y) { return; }

        wikiStore.table.selectedCell = { ...new Cell(x - 1, y - 1), value: element.textContent };

        // check if the user is selecting an annotation block
        const selectedBlock = checkSelectedAnnotationBlocks({ x1: x, y1: y, x2: x, y2: y });
        wikiStore.table.selectBlock(selectedBlock);
        if (!selectedBlock) {
            // Activate the selection mode
            this.selecting = true;
            const x1 = x, x2 = x, y1 = y, y2 = y;

            // Extend the previous selection if user is holding down Shift key
            if (event.shiftKey && wikiStore.table.selection) {
                const selection = { ...wikiStore.table.selection };

                // Extend the previous selection left or right
                if (x1 !== selection.x1) {
                    if (x1 < selection.x1) {
                        selection.x1 = x1;
                    } else {
                        selection.x2 = x1;
                    }
                }

                // Extend the previous selection up or down
                if (y1 !== selection.y1) {
                    if (y1 < selection.y1) {
                        selection.y1 = y1;
                    } else {
                        selection.y2 = y1;
                    }
                }
                wikiStore.table.selection = selection;
            } else {
                wikiStore.table.selection = { x1, x2, y1, y2 };
            }
        }

        // Initialize the previous element with the one selected
        this.prevElement = element;
    }


    handleOnMouseMove(event: React.MouseEvent) {
        const element = event.target as any;
        if (element === this.prevElement) { return; }

        const newColIndex = parseInt(element.dataset.colIndex)
        const newRowIndex = parseInt(element.dataset.rowIndex)

        // Don't allow out-of-bounds selecting / resizing
        if (!newColIndex || newColIndex === 0) { return }
        if (!newRowIndex || newRowIndex === 0) { return }

        if (this.selecting && !event.shiftKey) {
            if (!wikiStore.table.selection) {
                return;
            }
            const selection = { ...wikiStore.table.selection };

            // Update the last x coordinate of the selection
            selection.x2 = newColIndex;
            // Update the last y coordinate of the selection
            selection.y2 = newRowIndex;
            wikiStore.table.selection = selection

            // Update reference to the previous element
            this.prevElement = element;
        }
    }

    handleOnKeyDown(event: KeyboardEvent) {

        // remove selections
        if (event.code === 'Escape') {
            wikiStore.table.resetSelections()
            return;
        }

        const arrowCodes = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
        if (arrowCodes.includes(event.code)) {

            // Don't allow moving around when users are typing
            if ((event.target as any).nodeName === 'INPUT') { return; }

            // Don't allow moving around when selecting from the dropdown menu
            if ((event.target as any).nodeName === 'SELECT') { return; }


            event.preventDefault();
            const { tableData } = this.state;
            if (!tableData) { return }

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
                    if (row < Object.keys(tableData).length) {
                        row = row + 1;
                    }
                }

                // arrow left
                if (event.code === 'ArrowLeft') {
                    if (col > 0) {
                        col = col - 1;
                    }
                }

                // arrow right
                if (event.code === 'ArrowRight') {
                    if (col < tableData[row].length) {
                        col = col + 1;
                    }
                }
                const irow = row < Object.keys(tableData).length ? row + 1 : row;
                const icol = col < tableData[row].length ? col + 1 : col;
                const textContent = tableData[irow][icol].rawContent

                wikiStore.table.selectedCell = { ...new Cell(col, row), value: textContent };

                if (event.shiftKey) {
                    let selection = wikiStore.table.selection;
                    if (selection) {
                        const { x1, x2, y1, y2 } = selection;
                        if (event.code === 'ArrowUp' && y1 > 1) {
                            const nextElement = tableData[y1 - 1][x1];
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

                        if (event.code === 'ArrowDown' && y1 < Object.keys(tableData).length - 1) {
                            const nextElement = tableData[y1 + 1][x1];
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
                            const nextElement = tableData[y1][x1 - 1];
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
                        if (event.code === 'ArrowRight' && x1 < tableData[y1].length - 1) {
                            const nextElement = tableData[y1][x1 + 1];
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
                    console.log("handleOnKeyDown selected block:", selectedBlock)
                    wikiStore.table.selectBlock(selectedBlock);
                    if (!selectedBlock) {
                        wikiStore.table.selection = {
                            x1: wikiStore.table.selectedCell.col + 1,
                            y1: wikiStore.table.selectedCell.row + 1,
                            x2: wikiStore.table.selectedCell.col + 1,
                            y2: wikiStore.table.selectedCell.row + 1
                        }
                    }
                }
            }
        }
    }

    handleOnClickHeader(event: React.MouseEvent) {
        const element = event.target as any;
        const colIndex = parseInt(element.dataset.colIndex)
        const { tableData } = this.state;
        if (!tableData) { return; }

        for (let indexRow = 0; indexRow < Object.keys(tableData).length; indexRow++) {
            tableData[indexRow][colIndex - 1].maxWidth = true;
        }

        // const element = event.target as any;
        element.setAttribute('style', 'width: 100%;');
        element.parentElement.setAttribute('style', 'max-width: 1%');

        // const index = element.dataset.colIndex;
        // tableData.forEach((row: any) => {
        //     row[index].setAttribute('style', 'max-width: 1%');
        // });

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
            <div style={{ width: "calc(100% - 275px)", cursor: "default" }}
                className="text-white font-weight-bold d-inline-block text-truncate">
                {filename ? (
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
                <div style={{ cursor: "pointer", textDecoration: "underline", marginRight: "7px" }}
                    className="text-white  float-right d-inline-block">
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

    rowGetter(index: number): TableCell[] {
        console.log("combined table rowGetter", index)
        const { tableData, loadedRows } = this.state;
        if (!tableData) { return [] as TableCell[]; }
        if (!loadedRows[index] || !tableData[index]) {
            const rowData = [];
            while (rowData.length < tableData[0].length) {
                rowData.push({
                    content: '',
                    rawContent: '',
                    classNames: [],
                    ...DEFAULT_CELL_STATE
                })
            }
            tableData[index] = rowData;
        }
        this.fetchRows(index)
        return tableData[index];
    }

    async fetchRows(index: number) {
        // console.log("loadMoreRows", startIndex, stopIndex)
        if (this.penddingRowTimeout) {
            window.clearTimeout(this.penddingRowTimeout);
        }
        this.penddingRowTimeout = window.setTimeout(async () => {
            if (this.requestService) {
                const startIndex = index - 25;
                const endIndex = index + 25;
                const table = await this.requestService.getTableByRows(startIndex, endIndex) as TableDTO;

                const { tableData, loadedRows } = this.state
                if (!tableData) { return }

                for (let i = 0; i < table.cells.length; i++) {
                    const rowData = [];
                    for (let j = 0; j < table.cells[i].length; j++) {
                        const cell: TableCell = {
                            content: table.cells[i][j],
                            rawContent: table.cells[i][j],
                            classNames: [],
                            ...DEFAULT_CELL_STATE
                        };
                        rowData.push(cell);
                    }
                    tableData[i + table.firstRowIndex] = rowData;
                    loadedRows[i + table.firstRowIndex] = true;
                }
                this.setState({ tableData, rowCount: table.dims[0], loadedRows }, () => {
                    this.updateStatement();
                    console.log('this.state.tableData', Object.keys(this.state.tableData || []).length)
                    console.log('wikiStore', Object.keys(wikiStore.table.table.cells).length)
                })
            }
        }, 250);

    }

    renderTable() {
        const { tableData, rowCount } = this.state;

        return (
            <Dropzone accept=".csv, .tsv, .xls, .xlsx" onDrop={(files) => this.onDrop(files)}>
                {({ getRootProps, getInputProps }) => (
                    <div {...getRootProps({ className: 'dropzone w-100 h-100' })}>

                        {
                            tableData ?
                                <div className="w-100 h-100">
                                    <Table
                                        tableData={tableData}
                                        ableActivated={true}
                                        onMouseUp={this.handleOnMouseUp.bind(this)}
                                        onMouseDown={this.handleOnMouseDown.bind(this)}
                                        onMouseMove={this.handleOnMouseMove.bind(this)}
                                        onClickHeader={this.handleOnClickHeader.bind(this)}
                                        MIN_ROWS={100}
                                        MIN_COLUMNS={26}
                                        rowGetter={(index: number) => this.rowGetter(index)}
                                        rowCount={rowCount}
                                    />
                                </div>
                                :
                                <div className="dropcontainer w-100 h-100">
                                    <input {...getInputProps()} />
                                    <p>Drag-and-drop a spreadsheet file here, or click to select file</p>
                                </div>
                        }

                    </div>
                )}
            </Dropzone>



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
