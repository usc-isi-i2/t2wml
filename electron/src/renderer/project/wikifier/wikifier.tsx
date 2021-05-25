import React, { Component, Fragment } from 'react';

// App
import { Button, Card, OverlayTrigger, Spinner, Tooltip } from 'react-bootstrap';

// console.log
import { LOG, ErrorMessage, t2wmlColors } from '../../common/general';
import * as utils from '../../common/utils'

import RequestService, { IStateWithError } from '../../common/service';
import ToastMessage from '../../common/toast';
import CallWikifier from './call-wikifier';

import { observer } from "mobx-react"
import wikiStore from '../../data/store';
import { reaction, IReactionDisposer } from 'mobx';
import { getColumnTitleFromIndex } from '../../common/utils'
import Table from '../table/table';
import { TableCell, TableData, TableDTO } from '@/renderer/common/dtos';
import "../project.css";

interface WikifierProperties {
  isShowing: boolean;
}

interface WikifierState extends IStateWithError {
  partialCsv?: TableData;
  showSpinner: boolean;
  showCallWikifier: boolean;
  rowData: Array<any>,
  flag: number;
  propertiesMessage: string;
  wikifyRegionMessage: string;
}

@observer
class Wikifier extends Component<WikifierProperties, WikifierState> {
  public gridApi: any;
  public gridColumnApi: any;

  private requestService: RequestService;

  constructor(props: WikifierProperties) {
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
      wikifyRegionMessage: ''
    };
  }

  private disposers: IReactionDisposer[] = [];

  componentDidMount() {
    this.disposers.push(reaction(() => wikiStore.layers.partialCsv, (table) => this.updateTableData(table)));
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

            {/* button to upload wikifier file */}
            <OverlayTrigger overlay={uploadToolTipHtml} placement="bottom" trigger={["hover", "focus"]}>
              <Button
                className="d-inline-block float-right"
                variant="outline-light"
                size="sm"
                style={{ padding: "0rem 0.5rem" }}
                onClick={() => { document.getElementById("file_wikifier")?.click(); }}
              >
                Import Wikifier
                </Button>
            </OverlayTrigger>


            <Button
              className="d-inline-block float-right"
              variant="outline-light"
              size="sm"
              style={{ padding: "0rem 0.5rem", marginRight: "0.5rem" }}
              onClick={() => { this.setState({ showCallWikifier: true }) }}
              disabled={true} //until wikifier is working again
            >
              Wikify
            </Button>

            {/* button to upload wikidata file */}
            <OverlayTrigger overlay={uploadDefToolTipHtml} placement="bottom" trigger={["hover", "focus"]}>
              <Button
                className="d-inline-block float-right"
                variant="outline-light"
                size="sm"
                style={{ padding: "0rem 0.5rem", marginRight: "0.5rem" }}
                onClick={() => { document.getElementById("file_wikidata")?.click(); }}
              >
                Import Entities
                </Button>
            </OverlayTrigger>

            {/* hidden input of wikidata file */}
            <input
              type="file"
              id="file_wikidata"
              accept=".tsv"
              style={{ display: "none" }}
              onChange={this.uploadEntitiesFile.bind(this)}
              onClick={(event) => { (event.target as HTMLInputElement).value = '' }}
            />

            {/* hidden input of wikifier file */}
            <input
              type="file"
              id="file_wikifier"
              accept=".csv"
              style={{ display: "none" }}
              onChange={this.handleOpenWikifierFile.bind(this)}
              onClick={(event) => { (event.target as HTMLInputElement).value = '' }}
            />

          </Card.Header>

          {/* wikifier */}
          <Card.Body
            className="w-100 h-100 p-0"
            style={
              // (this.props.isShowing) ? { overflow: "hidden" } : { display: "none" }
              { display: "flex", overflow: "hidden" }
            }
          >

            <div className="mySpinner" hidden={!wikiStore.wikifier.showSpinner} style={(this.props.isShowing) ? {} : { display: "none" }}>
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

export default Wikifier;
