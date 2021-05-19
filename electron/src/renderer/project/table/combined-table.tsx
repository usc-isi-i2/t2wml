///header, footer (with sheet switcher), switcher between different table components

import React, { ChangeEvent, Component } from 'react';
import * as path from 'path';
import './table-component.css';

import { Button, ButtonGroup, Card, OverlayTrigger, Spinner, Tooltip } from 'react-bootstrap';

import { AnnotationBlock, TableCell, TableData, TableDTO } from '../../common/dtos';
import { LOG, ErrorMessage, Cell } from '../../common/general';
import { classNames } from '../../common/utils';
import RequestService from '../../common/service';
import SheetSelector from '../sheet-selector/sheet-selector';
import ToastMessage from '../../common/toast';
import TableLegend from './table-legend';


import { observer } from 'mobx-react';
import wikiStore, { TableMode } from '../../data/store';
import { IReactionDisposer, reaction } from 'mobx';
import AnnotationTable from './annotation-table/annotation-table';
import OutputTable from './output-table/output-table';
import WikifyTable from './wikify-table/wikify-table';
import { currentFilesService } from '../../common/current-file-service';
import Table from './table';


interface TableState {
    showSpinner: boolean;
    showToast: boolean;

    // table data
    filename?: string; // if undefined, show "Table Viewer"
    multipleSheets: boolean;
    sheetNames?: Array<string>;
    currSheetName?: string;
    tableData?: TableData;

    selectedCell?: Cell;
    selectedAnnotationBlock?: AnnotationBlock;

    mode: TableMode,

    errorMessage: ErrorMessage;
}

@observer
class CombinedTable extends Component<{}, TableState> {
    private requestService: RequestService;
    private tableRef = React.createRef<HTMLTableElement>().current!;
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

            mode: wikiStore.table.mode,

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
                    try{
                    const tableCell = tableData[indexPair[0]][indexPair[1]];
                    tableCell.classNames.push(`role-${entry.type}`);
                    }
                    catch{

                    }
                }
            }
        }

        else { this.setAnnotationColors(tableData) }

        const qnodes = wikiStore.layers.qnode;
        for (const entry of qnodes.entries) {
            for (const indexPair of entry.indices) {
                try{
                const tableCell = tableData[indexPair[0]][indexPair[1]];
                tableCell.classNames.push(`type-wikibaseitem`);
                }
                catch{
                    //pass
                }
            }
        }

        this.setState({ tableData });
    }

    setAnnotationColors(tableData?: TableData) {
        if (!tableData) {
            if (!this.state.tableData){
                return;
            }
            const tableData = {...this.state.tableData}
            //if we're taking existing table data, gotta clean it:
            tableData.forEach( row => {
                row.forEach( cell => {
                    cell.classNames = cell.classNames.filter(function(value, index, arr){
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
                        try{
                        const tableCell = tableData[rowIndex][colIndex];
                        tableCell.classNames.push(...classNames);
                        }
                        catch{
                            //TODO: handle annotating imaginary cells
                        }
                        colIndex += 1;
                    }
                    rowIndex += 1;
                }
            }
        }
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
            wikiStore.table.mode = 'annotation';

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
        if (this.state.mode == "annotation") {
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

    handleOnMouseUp() {
        //TODO
    }

    changeSelectedCell(selectedCell:Cell){
        wikiStore.table.selectedCell = selectedCell;
        this.setState({selectedCell})
    }

    handleOnMouseDown(event: React.MouseEvent) {
        const element = event.target as any;

        // Don't let users select header cells
        if (element.nodeName !== 'TD') { return; }

        const x1: number = element.cellIndex;
        const y1: number = element.parentElement.rowIndex;

        // Activate related cells
        const selectedCell = new Cell(x1 - 1, y1 - 1);
        this.changeSelectedCell(selectedCell)

      }


    handleOnKeyDown(event: KeyboardEvent) {
        const { selectedCell, tableData } = this.state;
        if (!selectedCell || !tableData) { return; }

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

          const newSelectedCell = new Cell(col, row);
          this.changeSelectedCell(newSelectedCell)

        }
      }

    handleOnMouseMove() {
        //TODO
    }


    handleOnClickHeader() {
        //TODO
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
