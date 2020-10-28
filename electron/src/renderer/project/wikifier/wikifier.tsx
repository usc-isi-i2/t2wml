import React, { Component, Fragment } from 'react';

// App
import { Button, Card, OverlayTrigger, Spinner, Tooltip } from 'react-bootstrap';

// console.log
import { LOG, ErrorMessage } from '../../common/general';
import * as utils from '../../common/utils'

import RequestService from '../../common/service';
import ToastMessage from '../../common/toast';
import CallWikifier from './call-wikifier';
import WikifierOutput from './wikifier-output';

import { observer } from "mobx-react"
import wikiStore from '../../data/store';
import { reaction, IReactionDisposer } from 'mobx';
import { getColumnTitleFromIndex } from '../../common/utils'

interface WikifierProperties {
  isShowing: boolean;
}

interface WikifierState {
  showSpinner: boolean;
  showCallWikifier: boolean;
  qnodeData: any,
  rowData: Array<any>,
  flag: number;
  scope: number;
  errorMessage: ErrorMessage;
  propertiesMessage: string;
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

      // appearance
      showSpinner: wikiStore.wikifier.showSpinner, //false,

      // wikifier data (from backend)
      qnodeData: wikiStore.wikifier.qnodeData,  // e.g. { "A1": { "context1": { "item": "Q111", "label": "xxx", "description": "xxx" }, ... }, ... }
      rowData: [], // e.g. [{ "context": "country", "col": "A", "row": "1", "value": "Burundi", "item": "Q967", "label": "Burundi", "description": "country in Africa" }]

      // call wikifier service
      showCallWikifier: false,
      flag: 0,

      // qnode editor
      scope: wikiStore.wikifier.scope,

      errorMessage: {} as ErrorMessage,
      propertiesMessage: ''
    };
  }

  private disposers: IReactionDisposer[] = [];

  componentDidMount() {
    this.disposers.push(reaction(() => wikiStore.layers.qnode, () => this.updateWikifierFromStoreQnodes()));
    this.updateWikifierFromStoreQnodes();
  }

  componentWillUnmount() {
    for (const disposer of this.disposers) {
      disposer();
    }
  }

  async handleDoCall(region: string, flag: string, context: string) {
    // validate input
    if (!/^[a-z]+\d+:[a-z]+\d+$/i.test(region) || !utils.isValidRegion(region)) {
      alert("Error: Invalid region.\n\nRegion must:\n* be defined as A1:B2, etc.\n* start from top left cell and end in bottom right cell.");
      return;
    }

    // before sending request
    this.setState({
      showCallWikifier: false,
      errorMessage: {} as ErrorMessage,
    });
    wikiStore.wikifier.showSpinner = true;

    // send request
    console.log("<Wikifier> -> %c/call_wikifier_service%c to wikify region: %c" + region, LOG.link, LOG.default, LOG.highlight);
    const formData = new FormData();
    formData.append("action", "wikify_region");
    formData.append("region", region);
    formData.append("context", context);
    formData.append("flag", flag);
    try {
      const json = await this.requestService.callWikifierService(wikiStore.projects.current!.folder, formData);
      console.log("<Wikifier> <- %c/call_wikifier_service%c with:", LOG.link, LOG.default);
      console.log(json);

      // do something here
      // const { error } = json;

      // // if failure
      // if (error !== undefined && error!==null) {
      //   throw Error(error);
      // }

      // else, success
      // const { qnodes, rowData, problemCells} = json;
      // if (problemCells){
      //   this.setState({ errorMessage: problemCells as ErrorMessage });
      // }
      // wikiStore.table.updateQnodeCells(qnodes, rowData);

      // follow-ups (success)
      wikiStore.wikifier.showSpinner = false;

    } catch (error) {
      console.log(error);
      this.setState({ errorMessage: error });

      // follow-ups (failure)
      wikiStore.table.updateQnodeCells();
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
        const { indices, url, ...row } = entry;
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
    const formData = new FormData();
    formData.append("file", file);
    try {
      const json = await this.requestService.uploadEntities(wikiStore.projects.current!.folder, formData);
      console.log("<Wikifier> <- %c/upload_entity_file%c with:", LOG.link, LOG.default);
      console.log(json);

      // // do something here
      // const { error } = json;

      // // if failure
      // if (error) {
      //   throw Error(error);
      // }

      // else, success
      // load wikifier data
      // const { qnodes, rowData } = json;
      // wikiStore.wikifier.updateWikifier(qnodes, rowData);

      const { added, failed, updated } = wikiStore.entitiesStats!;
      let message = `✅ Entities file loaded: ${added.length} added, ${updated.length} updated, ${failed.length} failed.`;
      if (failed.length) {
        message += '\n\nCheck the console for the failures reasons.'
      }
      this.setState({
        propertiesMessage: message
      });

      // follow-ups (success)
      wikiStore.wikifier.showSpinner = false;

    } catch (error) {
      console.log(error);
      error.errorDescription += "\n\nCannot upload entities file!";
      this.setState({ errorMessage: error });

      // follow-ups (failure)
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

        <Card
          className="w-100 shadow-sm"
          style={(this.props.isShowing) ? { height: "calc(100% - 40px)" } : { height: "40px" }}
        >

          <CallWikifier
            showCallWikifier={this.state.showCallWikifier}
            cancelCallWikifier={() => this.cancelCallWikifier()}
            handleDoCall={(region, flag, context) => this.handleDoCall(region, flag, context)} />

          {/* header */}
          <Card.Header
            style={{ height: "40px", padding: "0.5rem 1rem", background: "#006699" }}
            onClick={() => wikiStore.editors.nowShowing = "Wikifier"}
          >

            {/* title */}
            <div
              className="text-white font-weight-bold d-inline-block text-truncate"

              // style={{ width: "calc(100% - 75px)", cursor: "default" }}
              style={{ width: "calc(100% - 300px)", cursor: "default" }}
            >
              Wikifier
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
                Upload
                </Button>
            </OverlayTrigger>


            <Button
              className="d-inline-block float-right"
              variant="outline-light"
              size="sm"
              style={{ padding: "0rem 0.5rem", marginRight: "0.5rem" }}
              onClick={() => { this.setState({ showCallWikifier: true }) }}
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
              onChange={(event) => wikiStore.table.wikifierFile = (event.target as any).files[0]}
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
            <WikifierOutput
              rowData={this.state.rowData} />
          </Card.Body>

          {/* card footer */}
          {/* <Card.Footer
            style={
                (this.props.isShowing) ? { height: "40px", padding: "0.5rem 1rem", background: "whitesmoke" } : { display: "none" }
            }
            >
            <Button
                className="d-inline-block float-right"
                size="sm"
                style={{ borderColor: "#006699", background: "#006699", padding: "0rem 0.5rem" }}
            // onClick={this.handleApply.bind(this)}
            // disabled={!this.state.isValidYaml}
            >
                Download
            </Button>
            </Card.Footer> */}

        </Card >
      </Fragment>
    );
  }
}

export default Wikifier;
