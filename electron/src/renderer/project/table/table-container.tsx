///header, footer (with sheet switcher), switcher between different table components

import React, { ChangeEvent, Component } from 'react';

import './table-component.css';

import { Button, Card, OverlayTrigger, Spinner, Tooltip } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheckSquare } from '@fortawesome/free-solid-svg-icons';
import { faSquare } from '@fortawesome/free-solid-svg-icons';

import { AnnotationBlock } from '../../common/dtos';
import { LOG, ErrorMessage, Cell, CellSelection } from '../../common/general';
import RequestService from '../../common/service';
import SheetSelector from '../sheet-selector/sheet-selector';
import ToastMessage from '../../common/toast';
import TableLegend from './table-legend';


import { observer } from 'mobx-react';
import wikiStore from '../../data/store';
import { IReactionDisposer, reaction } from 'mobx';
import AnnotationTable from './annotation-table/annotation-table';
import OutputTable from './output-table/output-table';
import { currentFilesService } from '../../common/current-file-service';


interface TableState {
  showSpinner: boolean;
  showToast: boolean;

  // table data
  filename: string | null, // if null, show "Table Viewer"
  multipleSheets: boolean,
  sheetNames: Array<string> | null,
  currSheetName: string | null,

  selectedCell: Cell | null;
  selectedQualifiers: Array<Cell> | null,
  selectedMainSubject: Cell | null,
  selectedProperty: Cell | null,

  mode: 'Annotation' | 'Output',
  showCleanedData: boolean,
  showAnnotationMenu: boolean,
  annotationMenuPosition?: Array<number>,
  selectedAnnotationBlock?: AnnotationBlock,

  errorMessage: ErrorMessage,
}

@observer
class TableContainer extends Component<{}, TableState> {
  private selecting = false;
  private selections: CellSelection[] = [];

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

      selectedCell: new Cell(),
      selectedQualifiers: [],
      selectedMainSubject: new Cell(),
      selectedProperty: new Cell(),

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
    this.disposers.push(reaction(() => wikiStore.table.mode, () => this.updateMode()));
    this.disposers.push(reaction(() => currentFilesService.currentState.mappingType, () => this.uncheckAnnotationifYaml()));
  }

  componentWillUnmount() {
    for ( const disposer of this.disposers ) {
      disposer();
    }
  }

  uncheckAnnotationifYaml(){
    if (currentFilesService.currentState.mappingType==="Yaml"){
      wikiStore.table.mode="Output"
      this.setState({ mode: 'Output' })
    }
  }

  updateMode() {
    if (wikiStore.table.mode === 'Annotation') {
      this.setState({ mode: 'Annotation' });
      this.fetchAnnotations();
    } else {
      this.setState({ mode: 'Output' });
    }
  }

  async handleOpenTableFile(event: ChangeEvent) {
    this.resetTableData();

    // get table file
    const file = (event.target as HTMLInputElement).files![0];
    if ( !file ) { return; }

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
      wikiStore.table.mode="Annotation"

    } catch ( error ) {
      error.errorDescription += "\n\nCannot open file!";
      this.setState({ errorMessage: error });
    } finally {
      wikiStore.table.showSpinner = false;
      wikiStore.wikifier.showSpinner = false;
    }
  }

  resetTableData() { // ?
    this.selecting = false;
    this.selections = [];
    // this.resetSelections();
    this.setState({
      errorMessage: {} as ErrorMessage,
      showToast: false,
      selectedCell: null,
      selectedProperty: null,
      selectedQualifiers: null,
      selectedMainSubject: null,
      selectedAnnotationBlock: undefined,
      showAnnotationMenu: false,
    });
  }

  async handleSelectSheet(event: React.MouseEvent) {
    this.resetTableData();

    // remove current status
    wikiStore.yaml.yamlContent = '';
    wikiStore.output.isDownloadDisabled = true;

    // before sending request
    wikiStore.table.showSpinner = true;
    wikiStore.wikifier.showSpinner = true;

    // send request
    const sheetName = (event.target as HTMLInputElement).innerHTML;
    console.log("<TableComponent> -> %c/change_sheet%c for sheet: %c" + sheetName, LOG.link, LOG.default, LOG.highlight);
    try {
      // await this.requestService.changeSheet(wikiStore.projects.current!.folder, sheetName);
      currentFilesService.changeSheet(sheetName, currentFilesService.currentState.dataFile);
      await this.requestService.getTable();

      if ( wikiStore.yaml.yamlContent ) {
        wikiStore.output.isDownloadDisabled = false;
      }
    } catch ( error ) {
      error.errorDescription += "\n\nCannot change sheet!";
      this.setState({ errorMessage: error });
    }
    wikiStore.table.showSpinner = false;
    wikiStore.wikifier.showSpinner = false;

  }

  updateProjectInfo() {
    if ( wikiStore.projects.projectDTO ) {
      const project = wikiStore.projects.projectDTO;
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

  toggleAnnotationMode() {
    if (this.state.mode === 'Output'){
      wikiStore.table.mode = 'Annotation';
      // currentFilesService.changeAnnotationInSameSheet();
      if (currentFilesService.currentState.mappingType=="Yaml"){
        currentFilesService.setMappingFiles(); //try to change to an existing annotation
        if (currentFilesService.currentState.mappingType!="Annotation"){
          this.requestService.postAnnotationBlocks({"annotations":[]});
        }
      }
    } else {
      wikiStore.table.mode = 'Output';
      currentFilesService.changeYamlInSameSheet();
    }
  }

  async fetchAnnotations() {
    try {
      await this.requestService.call(this, () => (
        this.requestService.getMappingCalculation()
      ));
    } catch (error) {
      error.errorDescription += "\n\nCannot fetch annotations!";
      this.setState({ errorMessage: error });
    }
  }

  renderErrorMessage() {
    const { errorMessage } = this.state;
    if ( errorMessage.errorDescription ) {
      return (
        <ToastMessage message={this.state.errorMessage} />
      )
    }
  }

  renderTitle() {
    const { filename } = this.state;
    return (
      <div style={{ width: "calc(100% - 350px)", cursor: "default" }}
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

  renderAnnotationToggle() {
    const { mode } = this.state;
    return (
      <div className="annotation-mode-toggle"
        onClick={() => this.toggleAnnotationMode()}>
        {mode === 'Annotation' ? (
          <FontAwesomeIcon icon={faCheckSquare} />
        ) : (
          <FontAwesomeIcon icon={faSquare} />
        )}
        <p>Annotation Mode</p>
      </div>
    )
  }

  renderUploadTooltip() {
    return (
      <Tooltip style={{ width: "fit-content" }} id="upload">
        <div className="text-left small">
          <b>Accepted file types:</b><br />
          • Comma-Separated Values (.csv)<br />
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
          accept=".csv, .xls, .xlsx"
          style={{ display: "none" }}
          onChange={this.handleOpenTableFile.bind(this)}
          onClick={(event) => (event.target as HTMLInputElement).value = ''}
        />
      </React.Fragment>
    )
  }

  renderLoading() {
    return (
      <div className="mySpinner" hidden={!wikiStore.table.showSpinner}>
        <Spinner animation="border" />
      </div>
    )
  }

  renderTable() {
    if (this.state.mode === 'Annotation') {
      return <AnnotationTable />;
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
