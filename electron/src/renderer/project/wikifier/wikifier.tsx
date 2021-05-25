import React, { Component, Fragment } from 'react';

// App
import { Button, Card, OverlayTrigger, Spinner, Tooltip } from 'react-bootstrap';

// console.log
import { LOG, ErrorMessage, t2wmlColors } from '../../common/general';
import * as utils from '../../common/utils'

import RequestService, { IStateWithError } from '../../common/service';
import ToastMessage from '../../common/toast';
import Downloader from 'js-file-download';
import CallWikifier from './call-wikifier';

import { observer } from "mobx-react"
import wikiStore from '../../data/store';
import { reaction, IReactionDisposer } from 'mobx';
import { getColumnTitleFromIndex } from '../../common/utils'
import Table from '../table/table';
import { TableCell, TableData, TableDTO } from '@/renderer/common/dtos';
import "../project.css";
import Download from '../output/download';
import { currentFilesService } from '@/renderer/common/current-file-service';


interface PartialCsvState extends IStateWithError {
  filename: string;
  partialCsv?: TableData;
  showSpinner: boolean;
  showCallWikifier: boolean;
  rowData: Array<any>,
  flag: number;
  propertiesMessage: string;
  wikifyRegionMessage: string;
  showDownload: boolean;
  isDownloading: boolean;
  isLoadDatamart: boolean;
}

@observer
class PartialCsvPreview extends Component<{}, PartialCsvState> {
  public gridApi: any;
  public gridColumnApi: any;

  private requestService: RequestService;

  constructor(props: {}) {
    super(props);
    this.requestService = new RequestService();

    // init state
    this.state = {
      partialCsv: undefined,
      // appearance
      showSpinner: wikiStore.wikifier.showSpinner, //false,

      // wikifier data (from backend)
      rowData: [], // e.g. [{ "context": "country", "col": "A", "row": "1", "value": "Burundi", "subject": "Q967", "label": "Burundi", "description": "country in Africa" }]

      // call wikifier service
      showCallWikifier: false,
      flag: 0,


      errorMessage: {} as ErrorMessage,
      propertiesMessage: '',
      wikifyRegionMessage: '',

      filename: "",
      showDownload: false,
      isDownloading: false,
      isLoadDatamart: false
    };
  }

  private disposers: IReactionDisposer[] = [];

  componentDidMount() {
    this.disposers.push(reaction(() => wikiStore.layers.partialCsv, (table) => this.updateTableData(table)));
    this.disposers.push(reaction(() => currentFilesService.currentState.dataFile, () => this.updateFilename()));
    this.disposers.push(reaction(() => currentFilesService.currentState.sheetName, () => this.updateFilename()));
    //this.disposers.push(reaction(() => wikiStore.layers.qnode, () => this.updateWikifierFromStoreQnodes()));
    //this.updateWikifierFromStoreQnodes();
  }

  componentWillUnmount() {
    for (const disposer of this.disposers) {
      disposer();
    }
  }



  updateTableData(table?: TableDTO) {
    if ( !table || !table.cells ) {
      this.setState({ partialCsv: undefined });
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
    this.setState({ partialCsv: tableData });
  }

  async handleWikifyRegion(region: string, flag: string, context: string) {
    // validate input
    if (!/^[a-z]+\d+:[a-z]+\d+$/i.test(region) || !utils.isValidRegion(region)) {
      alert("Error: Invalid region.\n\nRegion must:\n* be defined as A1:B2, etc.\n* start from top left cell and end in bottom right cell.");
      return;
    }

    // before sending request
    this.setState({
      showCallWikifier: false,
      wikifyRegionMessage: ''
    });
    wikiStore.wikifier.showSpinner = true;

    // send request
    console.log("<Wikifier> -> %c/call_wikifier_service%c to wikify region: %c" + region, LOG.link, LOG.default, LOG.highlight);
    const data = {
      "action": "wikify_region",
      "region": region,
      "context": context,
      "flag": flag
    };
    try {
      await this.requestService.call(this, () => this.requestService.callWikifierService(data));
      console.log("<Wikifier> <- %c/call_wikifier_service%c with:", LOG.link, LOG.default);
      if (wikiStore.wikifier.wikifierError) {
        console.log("Wikify region cell errors:", wikiStore.wikifier.wikifierError)
        this.setState({
          wikifyRegionMessage: wikiStore.wikifier.wikifierError
        });
      }

    } catch (error) {
      console.log(error);
    } finally {
      wikiStore.wikifier.showSpinner = false;
    }

    //also update results:
    try {
      wikiStore.output.showSpinner = true;
      await this.requestService.call(this, () => this.requestService.getMappingCalculation())
    }
    catch (error) {
      console.log(error) //don't break on this
    }
    finally{
      wikiStore.output.showSpinner = false;
    }
    wikiStore.wikifier.showSpinner = true;
    try {
      await this.requestService.getPartialCsv();
    }
    finally {
      wikiStore.wikifier.showSpinner = false;
    }
  }

  cancelCallWikifier() {
    this.setState({ showCallWikifier: false });
  }

  updateWikifierFromStoreQnodes() {
    //rowData: [], // e.g. [{ "context": "country", "col": "A", "row": "1", "value": "Burundi", "id": "Q967", "label": "Burundi", "description": "country in Africa" }]
    console.debug('updateWikiferFromStoreQnodes called');
    const newRowData = [];
    if (wikiStore.layers.qnode) {
      for (const entry of wikiStore.layers.qnode.entries) {
        const { indices, ...row } = entry;
        for (const index_pair of indices) {
          const row_number = index_pair[0] + 1;
          const column_letter = getColumnTitleFromIndex(index_pair[1]);
          const row_entry = { col: column_letter, row: row_number, ...row };
          newRowData.push(row_entry);
        }
      }
    }
    this.setState({ rowData: newRowData });
  }


  async uploadEntitiesFile(event: any) {
    // get entities file
    const file = event.target.files[0];
    if (!file) return;

    // before sending request
    wikiStore.wikifier.showSpinner = true;
    this.setState({ propertiesMessage: '' });

    // send request
    const data = { "filepath": file.path };
    try {
      await this.requestService.call(this, () => this.requestService.uploadEntities(data));
      console.log("<Wikifier> <- %c/upload_entity_file%c with:", LOG.link, LOG.default);

      const { added, failed, updated } = wikiStore.wikifier.entitiesStats!;
      let message = `✅ Entities file loaded: ${added.length} added, ${updated.length} updated, ${failed.length} failed.`;
      if (failed.length) {
        message += '\n\nCheck the console for the failures reasons.'
        console.log(failed)
      }
      this.setState({
        propertiesMessage: message
      });

    } catch (error) {
      console.log(error);
    } finally {
      wikiStore.wikifier.showSpinner = false;
    }

    //also update results:
    try {
      wikiStore.output.showSpinner = true;
      await this.requestService.getMappingCalculation() //don't use call, we don't want to alert errors
    }
    catch (error) {
      console.log(error) //don't break on this
    }
    finally{
      wikiStore.output.showSpinner = false;
    }
    wikiStore.wikifier.showSpinner = true;
    try {
      await this.requestService.getPartialCsv();
    }
    finally {
      wikiStore.wikifier.showSpinner = false;
    }

  }

  async handleOpenWikifierFile(event: any) {
    const file: File = (event.target as any).files[0];

    if (!file) return;

    // before sending request
    wikiStore.table.showSpinner = true;
    wikiStore.wikifier.showSpinner = true;

    // send request
    console.log("<TableViewer> -> %c/upload_wikifier_output%c for wikifier file: %c" + file.name, LOG.link, LOG.default, LOG.highlight);
    const data = { "filepath": file.path };
    try {
      await this.requestService.call(this, () => this.requestService.uploadWikifierOutput(data));
      console.log("<TableViewer> <- %c/upload_wikifier_output%c with:", LOG.link, LOG.default);

      this.setState({
        propertiesMessage: "✅ Wikifier file loaded"
      });

    } catch (error) {
      console.log(error);
    } finally {
      wikiStore.table.showSpinner = false;
      wikiStore.wikifier.showSpinner = false;
    }

    //also update results:
    try {
      wikiStore.output.showSpinner = true;
      await this.requestService.getMappingCalculation() //don't use call, we don't want to alert errors
    }
    catch (error) {
      console.log(error) //don't break on this
    }
    finally{
      wikiStore.output.showSpinner = false;
    }
    wikiStore.wikifier.showSpinner = true;
    try {
      await this.requestService.getPartialCsv();
    }
    finally {
      wikiStore.wikifier.showSpinner = false;
    }

  }

  async handleDoDownload(fileName: string, fileType: string) {
    const filename = fileName + "." + fileType;

    // before sending request
    this.setState({ isDownloading: true, showDownload: false });

    // send request
    console.debug("<Output> -> %c/download%c for file: %c" + filename, LOG.link, LOG.default, LOG.highlight);

    try {
      const json = await this.requestService.call(this, () => this.requestService.downloadResults(fileType));
      console.log("<Output> <- %c/download%c with:", LOG.link, LOG.default);
      console.log(json);

      // do something here
      const { error } = json;

      // if failure
      if (error) {
        throw Error(error);
      }

      // else, success
      const { data, internalErrors } = json;
      if (internalErrors) {
        console.log("ERRORS in input to download:")
        console.log(internalErrors);
        this.setState({
          errorMessage:
            {
              errorCode: 400,
              errorTitle: "Problems within statements",
              errorDescription: "Although the file downloaded, there were errors in the input, check console for details"
            } as ErrorMessage
        })
      }
      Downloader(data, filename);

    } catch (error) {
      console.log(error);
    } finally {
      this.setState({ isDownloading: false });
    }
  }


  cancelDownload() {
    this.setState({ showDownload: false });
  }


  updateFilename(){
    const datafile = currentFilesService.currentState.dataFile;
    const file_without_ext = datafile.substring(0, datafile.lastIndexOf('.')) || datafile;
    const sheetName = currentFilesService.currentState.sheetName;
    const sheet_without_ext = sheetName.substring(0, sheetName.lastIndexOf('.')) || sheetName;
    const filename = file_without_ext+"_"+sheet_without_ext;
    this.setState({filename})
  }

  async loadToDatamart() {
    // TODO !
    wikiStore.output.showSpinner = true;
    wikiStore.table.showSpinner = true;
    this.setState({ isLoadDatamart: true });
    console.log("Load to Datamart");
    try {
      const json = await this.requestService.call(this, () => this.requestService.loadToDatamart())
      console.log(json);
      const { datamart_get_url, variables, description } = json;
      if (datamart_get_url !== undefined) {
        alert("Success! To download the data in canonical format use this url:\n" + datamart_get_url +"\n"
        +"And add the name of the variable at the end. Your variables are: \n"+variables)
        // prompt('Success! Use this url to download the data in canonical format:', datamart_get_url)
      } else {
        alert("Failed to load to Datamart\nError: " + description)
      }
    } catch (error) {
      console.log(error);
      const { errorTitle, errorDescription } = error;
      if (errorTitle !== undefined) {
        alert("Failed to load to Datamart\nError: " + errorTitle + "\nDescription: " + errorDescription);
      }
    } finally {
      this.setState({ isLoadDatamart: false });
      wikiStore.output.showSpinner = false;
      wikiStore.table.showSpinner = false;
    }
  }

  render() {

    // render upload tooltip
    const uploadToolTipHtml = (
      <Tooltip style={{ width: "fit-content" }} id="upload">
        <div className="text-left small">
          <b>Accepted file types:</b><br />
          • Comma-Separated Values (.csv)
        </div>
      </Tooltip>
    );

    const uploadDefToolTipHtml = (
      <Tooltip style={{ width: "fit-content" }} id="upload">
        <div className="text-left small">
          <b>Accepted file types:</b><br />
            • Tab-Separated kgtk files(.tsv)
          </div>
      </Tooltip>
    );

    return (
      <Fragment>
          <Download
          key={this.state.filename}
          filename={this.state.filename}
          showDownload={this.state.showDownload}
          handleDoDownload={(fileName: string, fileType: string) => this.handleDoDownload(fileName, fileType)}
          cancelDownload={() => this.cancelDownload()} />
        {this.state.errorMessage.errorDescription ? <ToastMessage message={this.state.errorMessage} /> : null}
        {this.state.propertiesMessage != '' ? <ToastMessage message={this.state.propertiesMessage} /> : null}
        {this.state.wikifyRegionMessage != '' ? <ToastMessage message={this.state.wikifyRegionMessage} /> : null}

        <Card
          className="w-100 h-100 shadow-sm"
          style={{ height: "calc(100% - 40px)"}}
          // style={(this.props.isShowing) ? { height: "calc(100% - 40px)" } : { height: "40px" }}
        >

          <CallWikifier
            showCallWikifier={this.state.showCallWikifier}
            cancelCallWikifier={() => this.cancelCallWikifier()}
            handleWikifyRegion={(region, flag, context) => this.handleWikifyRegion(region, flag, context)} />

          {/* header */}
          <Card.Header
            style={{ height: "40px", padding: "0.5rem 1rem", background: t2wmlColors.WIKIFIER }}
            onClick={() => wikiStore.editors.nowShowing = "Wikifier"}
          >

            {/* title */}
            <div
              className="text-white font-weight-bold d-inline-block text-truncate"

              // style={{ width: "calc(100% - 75px)", cursor: "default" }}
              style={{ width: "calc(100% - 300px)", cursor: "default" }}
            >
              Output Preview
            </div>


            <Button
              className="d-inline-block float-right"
              variant="outline-light"
              size="sm"
              style={{ padding: "0rem 0.5rem" }}
              onClick={() => this.loadToDatamart()}
              disabled={true}
            >
              {this.state.isLoadDatamart ? <Spinner as="span" animation="border" size="sm" /> : "Load to Datamart (Beta)"}
            </Button>

            {/* button to download */}
            <Button
              className="d-inline-block float-right"
              variant="outline-light"
              size="sm"
              style={{ padding: "0rem 0.5rem", marginRight: "0.5rem" }}
              onClick={() => this.setState({ showDownload: true })}
              disabled={wikiStore.output.isDownloadDisabled || this.state.isDownloading}
            >
              {this.state.isDownloading ? <Spinner as="span" animation="border" size="sm" /> : "Save to file"}
            </Button>

          </Card.Header>

          {/* wikifier */}
          <Card.Body
            className="w-100 h-100 p-0"
            style={
              { display: "flex", overflow: "hidden" }
            }
          >

            <div className="mySpinner" hidden={!wikiStore.wikifier.showSpinner}>
              <Spinner animation="border" />
            </div>


            {/* wikifier output */}
            <div className="wikifier-tab">
              <Table
              tableData={this.state.partialCsv}
              setTableReference={()=>(null)}/>
            </div>
          </Card.Body>

        </Card >
      </Fragment>
    );
  }
}

export default PartialCsvPreview;
