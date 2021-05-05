///header, footer (with sheet switcher), switcher between different table components

import React, { ChangeEvent, Component } from 'react';
import * as path from 'path';
import './table-component.css';

import { Button, ButtonGroup, Card, OverlayTrigger, Spinner, Tooltip } from 'react-bootstrap';

import { AnnotationBlock } from '../../common/dtos';
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


interface TableState {
  showSpinner: boolean;
  showToast: boolean;

  // table data
  filename: string | null; // if null, show "Table Viewer"
  multipleSheets: boolean;
  sheetNames: Array<string> | null;
  currSheetName: string | null;

  selectedCell?: Cell;
  selectedQualifiers?: Array<Cell>;
  selectedMainSubject?: Cell;
  selectedProperty?: Cell;

  mode: TableMode,
  showCleanedData: boolean;
  showAnnotationMenu: boolean;
  annotationMenuPosition?: Array<number>;
  selectedAnnotationBlock?: AnnotationBlock;

  errorMessage: ErrorMessage;
}

@observer
class TableContainer extends Component<{}, TableState> {
  private selecting = false;

  private requestService: RequestService;

  constructor(props: {}) {
    super(props);

    this.requestService = new RequestService();

    // init state
    this.state = {
      // appearance
      showSpinner: wikiStore.table.showSpinner,
      showToast: false,

      // table data
      filename: null,
      sheetNames: null,
      currSheetName: null,
      multipleSheets: false,

      selectedCell: undefined,
      selectedQualifiers: [],
      selectedMainSubject: undefined,
      selectedProperty: undefined,

      mode: wikiStore.table.mode,
      showCleanedData: false,
      showAnnotationMenu: false,
      annotationMenuPosition: [50, 70],
      selectedAnnotationBlock: undefined,

      errorMessage: {} as ErrorMessage,
    };
  }

  private disposers: IReactionDisposer[] = [];

  componentDidMount() {
    this.uncheckAnnotationifYaml();
    this.disposers.push(reaction(() => wikiStore.table.table, () => this.updateProjectInfo()));
    this.disposers.push(reaction(() => currentFilesService.currentState.dataFile, () => this.updateProjectInfo()));
    this.disposers.push(reaction(() => currentFilesService.currentState.mappingType, () => this.uncheckAnnotationifYaml()));
    this.disposers.push(reaction(() => wikiStore.table.showSpinner, (show) => this.setState({ showSpinner: show })));
  }

  componentWillUnmount() {
    for (const disposer of this.disposers) {
      disposer();
    }
  }

  uncheckAnnotationifYaml() {
    if (currentFilesService.currentState.mappingType === "Yaml") {
      wikiStore.table.mode = 'output';
      this.setState({ mode: 'output' });
    }
  }

  async handleOpenTableFile(event: ChangeEvent) {
    this.resetTableData();

    // get table file
    const file = (event.target as HTMLInputElement).files![0];
    if (!file) { return; }

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
      this.switchMode('annotation')

    } catch (error) {
      error.errorDescription += "\n\nCannot open file!";
      this.setState({ errorMessage: error });
    } finally {
      wikiStore.table.showSpinner = false;
      wikiStore.wikifier.showSpinner = false;
    }
  }

  resetTableData() { // ?
    this.selecting = false;
    this.setState({
      errorMessage: {} as ErrorMessage,
      showToast: false,
      selectedCell: undefined,
      selectedProperty: undefined,
      selectedQualifiers: undefined,
      selectedMainSubject: undefined,
      selectedAnnotationBlock: undefined,
      showAnnotationMenu: false,
    });
  }

  async handleSelectSheet(event: React.MouseEvent) {
    this.resetTableData();

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

    if (this.state.mode === 'annotation') { this.createAnnotationIfDoesNotExist(); }
  }

  async switchMode(mode: TableMode) {
    wikiStore.table.showSpinner = true;
    wikiStore.yaml.showSpinner = true;

    this.setState({ mode }, () => {
      wikiStore.table.mode = mode;
    });

    this.resetTableData();

    if (mode === 'annotation') {
      this.fetchAnnotations();
    }

    wikiStore.table.showSpinner = false;
    wikiStore.yaml.showSpinner = false;
  }

  async createAnnotationIfDoesNotExist(){
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

  async fetchAnnotations() {
    if (!currentFilesService.currentState.dataFile) { return; }
    this.createAnnotationIfDoesNotExist();
    try {
      await this.requestService.call(this, () => (
        this.requestService.getMappingCalculation()
      ));
    } catch (error) {
      error.errorDescription += "\n\nCannot fetch annotations!";
      this.setState({ errorMessage: error });
    }

    wikiStore.wikifier.showSpinner = true;
    try {
      await this.requestService.getPartialCsv();
    }
    finally {
      wikiStore.wikifier.showSpinner = false;
    }

  }

  async getAnnotationSuggestion() {
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

    let data={} as any;
    let hasSubject=false;
    for (const block of wikiStore.annotations.blocks){
      if (block.role=="mainSubject"){
        hasSubject=true;
        data={"selection": block.selection};
      }
    }

    if (hasSubject)
    try {
      await this.requestService.call(this, () => this.requestService.callCountryWikifer(data))
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
          <span onClick={() => this.getAnnotationSuggestion()}>Suggest annotation</span>
        </div>
      )
    }
  }

  renderAnnotationToggle() {
    const { mode } = this.state;
    if (this.state.filename) {
      return (
        <ButtonGroup aria-label="modes" className="mode-toggle">
          <Button variant="outline-light"
            className={classNames('btn-sm py-0 px-2', {
              'active': mode === 'annotation',
            })}
            disabled={currentFilesService.currentState.mappingType === 'Yaml'}
            onClick={() => this.switchMode('annotation')}>
            Annotate
          </Button>

          <Button variant="outline-light"
            className={classNames('btn-sm py-0 px-2', {
              'active': mode === 'wikify',
            })}
            onClick={() => this.switchMode('wikify')}>
            Wikify
          </Button>
          <Button variant="outline-light"
            className={classNames('btn-sm py-0 px-2', {
              'active': mode === 'output',
            })}

            onClick={() => this.switchMode('output')}>
            Output
          </Button>
        </ButtonGroup>
      )
    }
    return <div></div>
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
    if (this.state.mode === 'annotation') {
      return <AnnotationTable />;
    } else if (this.state.mode === 'wikify') {
      return <WikifyTable />;
    }
    return <OutputTable />;
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
            {this.renderAnnotationToggle()}
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

export default TableContainer;
