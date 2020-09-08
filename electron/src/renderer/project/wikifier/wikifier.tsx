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

  private requestService: RequestService

  constructor(props: WikifierProperties) {
    super(props);
    this.requestService = new RequestService();

    // init state
    this.state = {

      // appearance
      showSpinner: wikiStore.wikifier.showSpinner, //false,

      // wikifier data (from backend)
      qnodeData: wikiStore.wikifier.state?.qnodeData,  // e.g. { "A1": { "context1": { "item": "Q111", "label": "xxx", "desc": "xxx" }, ... }, ... }
      rowData: [], // e.g. [{ "context": "country", "col": "A", "row": "1", "value": "Burundi", "item": "Q967", "label": "Burundi", "desc": "country in Africa" }]

      // call wikifier service
      showCallWikifier: false,
      flag: 0,

      // qnode editor
      scope: wikiStore.wikifier.scope,

      errorMessage: {} as ErrorMessage,
      propertiesMessage: ''
    };

    wikiStore.wikifier.updateWikifier = (qnodeData: any = {}, rowData: any = []) => this.updateWikifier(qnodeData, rowData);        
  }

  // handleAddRegion() {
  //   let tempNewRegion = this.refs.tempNewRegion.value.trim();

  //   // validate input
  //   if (!/^[a-z]+\d+:[a-z]+\d+$/i.test(tempNewRegion) || !utils.isValidRegion(tempNewRegion)) {
  //     alert("Error: Invalid region.\n\nRegion must:\n* be defined as A1:B2, etc.\n* start from top left cell and end in bottom right cell.");
  //     return;
  //   }

  //   // before sending request
  //   this.setState({ showSpinner: true });

  //   // send request
  //   console.log("<Wikifier> -> %c/call_wikifier_service%c to add region: %c" + tempNewRegion, LOG.link, LOG.default, LOG.highlight);
  //   let formData = new FormData();
  //   formData.append("pid", window.pid);
  //   formData.append("action", "add_region");
  //   formData.append("region", tempNewRegion);
  //   fetch(window.server + "/call_wikifier_service", {
  //     mode: "cors",
  //     body: formData,
  //     method: "POST"
  //   }).then((response) => {
  //     if (!response.ok) throw Error(response.statusText);
  //     return response;
  //   }).then((response) => {
  //     return response.json();
  //   }).then((json) => {
  //     console.log("<Wikifier> <- %c/call_wikifier_service%c with:", LOG.link, LOG.default);
  //     console.log(json);

  //     // do something here
  //     const { error } = json;

  //     // if failure
  //     if (error !== null) {
  //       throw Error(error);
  //     }

  //     // else, success
  //     const { qnodes, rowData } = json;
  //     window.TableViewer.updateQnodeCells(qnodes, rowData);
  //     // FUTURE: the following line is unstable
  //     this.handleSelectRegion(tempNewRegion);

  //     // follow-ups (success)
  //     this.setState({
  //       showSpinner: false
  //     });
  //     this.refs.tempNewRegion.value = "";

  //   }).catch((error) => {
  //     console.log(error);

  //     // follow-ups (failure)
  //     window.TableViewer.updateQnodeCells();
  //     this.setState({ showSpinner: false });
  //   });
  // }

  // handleDeleteRegion(region) {

  //   // before sending request
  //   this.setState({ showSpinner: true });

  //   // send request
  //   console.log("<Wikifier> -> %c/call_wikifier_service%c to delete region: %c" + region, LOG.link, LOG.default, LOG.highlight);
  //   let formData = new FormData();
  //   formData.append("pid", window.pid);
  //   formData.append("action", "delete_region");
  //   formData.append("region", region);
  //   fetch(window.server + "/call_wikifier_service", {
  //     mode: "cors",
  //     body: formData,
  //     method: "POST"
  //   }).then((response) => {
  //     if (!response.ok) throw Error(response.statusText);
  //     return response;
  //   }).then((response) => {
  //     return response.json();
  //   }).then((json) => {
  //     console.log("<Wikifier> <- %c/call_wikifier_service%c with:", LOG.link, LOG.default);
  //     console.log(json);

  //     // do something here
  //     const { error } = json;

  //     // if failure
  //     if (error !== null) {
  //       throw Error(error);
  //     }

  //     // else, success
  //     const { qnodes, rowData } = json;
  //     window.TableViewer.updateQnodeCells(qnodes, rowData);

  //     // follow-ups (success)
  //     this.setState({ showSpinner: false });

  //   }).catch((error) => {
  //     console.log(error);

  //     // follow-ups (failure)
  //     window.TableViewer.updateQnodeCells();
  //     this.setState({ showSpinner: false });
  //   });
  // }

  handleDoCall(region: string, flag: string, context: string) {
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
    this.requestService.callWikifierService(wikiStore.project.pid, formData).then((json) => {
      console.log("<Wikifier> <- %c/call_wikifier_service%c with:", LOG.link, LOG.default);
      console.log(json);

      // do something here
      const { error } = json;

      // if failure
      if (error !== undefined && error!==null) {
        throw Error(error);
      }

      // else, success
      const { qnodes, rowData, problemCells} = json;
      if (problemCells){
        this.setState({ errorMessage: problemCells as ErrorMessage });
      }
      wikiStore.table.updateQnodeCells(qnodes, rowData);

      // follow-ups (success)
      wikiStore.wikifier.showSpinner = false;

    }).catch((error: ErrorMessage) => {
      console.log(error);
      this.setState({ errorMessage: error });

      // follow-ups (failure)
      wikiStore.table.updateQnodeCells();
        wikiStore.wikifier.showSpinner = false;
    });
  }

  cancelCallWikifier() {
    this.setState({ showCallWikifier: false });
  }

  // handleSelectRegion(region) {
  //   if (region === this.state.currRegion) return;

  //   // switch region
  //   console.log("<Wikifier> selected region: %c" + region, LOG.highlight);
  //   this.setState({ currRegion: region });

  //   // update wikifier output
  //   this.updateRowData(region);
  // }

  // handleUpdateQnode(params) {
  //   const { cell, qnode } = params["data"];
  //   let { currRegion, scope } = this.state;

  //   // before sending request
  //   this.setState({ showSpinner: true });

  //   // send request
  //   console.log("<Wikifier> -> %c/call_wikifier_service%c to update qnode: %c" + cell + " (" + qnode + ")", LOG.link, LOG.default, LOG.highlight);
  //   let formData = new FormData();
  //   formData.append("pid", window.pid);
  //   formData.append("action", "update_qnode");
  //   formData.append("region", currRegion);
  //   formData.append("cell", cell);
  //   formData.append("qnode", qnode);
  //   formData.append("apply_to", scope);
  //   fetch(window.server + "/call_wikifier_service", {
  //     mode: "cors",
  //     body: formData,
  //     method: "POST"
  //   }).then((response) => {
  //     if (!response.ok) throw Error(response.statusText);
  //     return response;
  //   }).then((response) => {
  //     return response.json();
  //   }).then((json) => {
  //     console.log("<Wikifier> <- %c/call_wikifier_service%c with:", LOG.link, LOG.default);
  //     console.log(json);

  //     // do something here
  //     const { error } = json;

  //     // if failure
  //     if (error !== null) {
  //       throw Error(error);
  //     }

  //     // else, success
  //     const { qnodes, rowData } = json;
  //     window.TableViewer.updateQnodeCells(qnodes, rowData);
  //     this.handleSelectRegion(currRegion);

  //     // follow-ups (success)
  //     this.setState({ showSpinner: false });

  //   }).catch((error) => {
  //     console.log(error);

  //     // follow-ups (failure)
  //     window.TableViewer.updateQnodeCells();
  //     this.setState({ showSpinner: false });
  //   });
  // }

  // updateCacheQnode(qnodes = null) {
  //   // param: qnodes, e.g. ["Q111", "Q222", "Q333", ...]

  //   // if no input, cache all qnodes
  //   if (qnodes === null) qnodes = Object.values(this.state.qnodeData);
  //   qnodes = Array.from(new Set(qnodes));

  //   // remove qnodes that already cached
  //   const cached = Object.keys(this.state.cacheOfQnodes);
  //   qnodes = qnodes.filter(function (x) { return cached.indexOf(x) === -1 });

  //   // cache qnode
  //   if (qnodes.length === 0) return;
  //   this.setState({ showSpinner: true });
  //   const api = window.sparqlEndpoint + "?format=json&query=SELECT%20%3Fqnode%20%28MIN%28%3Flabel%29%20AS%20%3Flabel%29%20%28MIN%28%3Fdesc%29%20AS%20%3Fdesc%29%20WHERE%20%7B%0A%20%20VALUES%20%3Fqnode%20%7B%20wd%3A" + qnodes.join("%20wd%3A") + "%7D%0A%20%20%3Fqnode%20rdfs%3Alabel%20%3Flabel%3B%20<http%3A%2F%2Fschema.org%2Fdescription>%20%3Fdesc.%0A%20%20FILTER%20%28langMatches%28lang%28%3Flabel%29%2C%22EN%22%29%29%0A%20%20FILTER%20%28langMatches%28lang%28%3Fdesc%29%2C%22EN%22%29%29%0A%7D%0AGROUP%20BY%20%3Fqnode";
  //   fetch(api)
  //     .then(response => response.json())
  //     .then(json => {
  //       console.log("<Wikifier> updated %cqnode cache", LOG.highlight);
  //       console.log(json);

  //       let { cacheOfQnodes } = this.state;

  //       // update qnode by query results from sparql endpoint
  //       const bindings = json["results"]["bindings"];
  //       for (let i = 0, len = bindings.length; i < len; i++) {
  //         const qnode = json["results"]["bindings"][i]["qnode"]["value"].match(/[QP]\d+$/)[0];
  //         const label = json["results"]["bindings"][i]["label"]["value"];
  //         const description = json["results"]["bindings"][i]["desc"]["value"];
  //         cacheOfQnodes[qnode] = { "label": label, "description": description };
  //       }

  //       // update mismatched qnodes (for clear qnode cache feature)
  //       for (let i = 0, len = qnodes.length; i < len; i++) {
  //         const qnode = qnodes[i];
  //         if (cacheOfQnodes[qnode] === undefined) {
  //           cacheOfQnodes[qnode] = { "label": "-", "description": "-" };
  //         }
  //       }

  //       // update state
  //       this.setState({ cacheOfQnodes: cacheOfQnodes });
  //       this.updateRowData();

  //       // follow-ups (success)
  //       console.log(cacheOfQnodes);
  //       this.setState({ showSpinner: false });

  //     }).catch((error) => {
  //       console.log(error);

  //       // follow-ups (failure)
  //       this.setState({ showSpinner: false });
  //     });
  // }

  // updateRowData(region = null) {
  //   const { qnodeData, regionData, currRegion, cacheOfQnodes } = this.state;
  //   if (region === null) region = currRegion;
  //   const tableData = window.TableViewer.state.rowData;

  //   // get cell list shown in first col
  //   let cells;
  //   if (region === "All") {
  //     cells = utils.sortCells(Object.keys(qnodeData));
  //   } else {
  //     cells = regionData[region];
  //   }

  //   // fill table
  //   let rowData = new Array(cells.length);
  //   for (let i = 0; i < cells.length; i++) {
  //     const cell = cells[i];
  //     const [col, row] = cell.match(/[a-z]+|[^a-z]+/gi);
  //     const value = tableData[parseInt(row) - 1][col];
  //     const qnode = qnodeData[cell];

  //     // one-row data
  //     let rowDatum = {
  //       "cell": cell,
  //       "value": value,
  //       "qnode": qnode,
  //       "label": "...",
  //       "description": "..."
  //     };
  //     if (qnode === "") {
  //       rowDatum["label"] = "";
  //       rowDatum["description"] = "";
  //     }
  //     if (cacheOfQnodes[qnode] !== undefined) {
  //       rowDatum["label"] = cacheOfQnodes[qnode]["label"];
  //       rowDatum["description"] = cacheOfQnodes[qnode]["description"];
  //     }

  //     // appand this one-row data
  //     rowData[i] = rowDatum;
  //   }
  //   this.setState({ rowData: rowData });

  //   if (rowData.length === 0) {
  //     this.gridApi.sizeColumnsToFit();
  //   } else {
  //     this.gridApi.sizeColumnsToFit();
  //     // this.gridColumnApi.autoSizeAllColumns();
  //   }
  // }

  // renderRegionSelector() {
  //   const { regionData, currRegion } = this.state;
  //   const regions = Object.keys(regionData);

  //   let regionSelectorHtml = [];

  //   // all
  //   regionSelectorHtml.push(
  //     <RegionTab
  //       key="All"
  //       region="All"
  //       selected={(currRegion === "All") ? true : false}
  //       handleSelectRegion={() => this.handleSelectRegion("All")}
  //       handleDeleteRegion={(event) => {
  //         event.stopPropagation(); // prevent selecting deleted region
  //         this.handleDeleteRegion("All");
  //       }}
  //     />
  //   );

  //   // regions
  //   for (let i = 0, len = regions.length; i < len; i++) {
  //     regionSelectorHtml.push(
  //       <RegionTab
  //         key={regions[i]}
  //         region={regions[i]}
  //         selected={(regions[i] === currRegion) ? true : false}
  //         handleSelectRegion={() => this.handleSelectRegion(regions[i])}
  //         handleDeleteRegion={(event) => {
  //           event.stopPropagation(); // prevent selecting deleted region
  //           this.handleDeleteRegion(regions[i]);
  //         }}
  //       />
  //     );
  //   }

  //   // add region
  //   regionSelectorHtml.push(
  //     <div
  //       key="Add"
  //       className="w-100"
  //       style={{
  //         height: "32px",
  //         position: "relative",
  //         borderBottom: "1px solid lightgray"
  //       }}
  //     >
  //       <div
  //         style={{
  //           width: "100%",
  //           padding: "0px 10px 0px 8px",
  //           position: "absolute",
  //           top: "50%",
  //           msTransform: "translateY(-50%)",
  //           transform: "translateY(-50%)",
  //           fontSize: "12px"
  //         }}
  //       >
  //         <input
  //           ref="tempNewRegion"
  //           type="text"
  //           style={{
  //             display: "inline-block",
  //             width: "calc(100% - 17px)"
  //           }}
  //           // value={this.state.input}
  //           placeholder="e.g. A1:B2"
  //           readOnly={this.state.showSpinner}
  //           // onChange={(event) => {
  //           //   this.setState({ input: event.target.value });
  //           // }}
  //           onKeyPress={(event) => {
  //             if (event.key === "Enter") {
  //               // if press enter (13), then do add region
  //               event.preventDefault();
  //               this.handleAddRegion();
  //             }
  //           }}
  //         />
  //         <span
  //           className="myTextButton"
  //           style={{
  //             display: "inline-block",
  //             width: "10px",
  //             cursor: "pointer",
  //             marginLeft: "5px",
  //             // fontWeight: "bold",
  //             fontSize: "14px",
  //             color: "hsl(150, 50%, 40%)"
  //           }}
  //           title="Add region"
  //           onClick={this.handleAddRegion.bind(this)}
  //         >＋</span>
  //       </div>
  //     </div>
  //   );

  //   return regionSelectorHtml;
  // }

  updateWikifier(qnodeData = {}, rowData = []) {
    this.setState({
        rowData: rowData,
    });
    if (wikiStore.wikifier.state) {
       wikiStore.wikifier.state.qnodeData = qnodeData;
    }
  }

  uploadWikidataFile(event: any) {
    // get wikidata file
    const file = event.target.files[0];
    if (!file) return;

    // before sending request
    wikiStore.wikifier.showSpinner = true;
    this.setState({ propertiesMessage: '' });

    // send request
    const formData = new FormData();
    formData.append("file", file);
    this.requestService.uploadWikidata(wikiStore.project.pid, formData).then((json) => {
      console.log("<Wikifier> <- %c/upload_wikidata_file%c with:", LOG.link, LOG.default);
      console.log(json);

      // do something here
      const { error } = json;

      // if failure
      if (error) {
        throw Error(error);
      }

      // else, success
      // load wikifier data
      const { qnodes, rowData } = json;
      this.updateWikifier(qnodes, rowData);

      const { added, failed, updated } = json.widget;
          let message = `✅ Definitions file loaded: ${added.length} added, ${updated.length} updated, ${failed.length} failed.`;
          if (failed.length) {
              message += '\n\nCheck the console for the failures reasons.'
          }
          this.setState({
            propertiesMessage: message
          });

      // follow-ups (success)
      wikiStore.wikifier.showSpinner = false;

    }).catch((error: ErrorMessage) => {
      console.log(error);
      error.errorDescription += "\n\nCannot upload wikidata file!";
      this.setState({ errorMessage: error });
    
      // follow-ups (failure)
      wikiStore.wikifier.showSpinner = false;
    });
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
        {this.state.errorMessage.errorDescription ? <ToastMessage message={this.state.errorMessage}/> : null }
        {this.state.propertiesMessage != '' ? <ToastMessage message={this.state.propertiesMessage}/> : null }

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
            onClick={() => wikiStore.editors.nowShowing = "Wikifier" }
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
                    Import Wikidata 
                </Button>
            </OverlayTrigger>

             {/* hidden input of wikidata file */}
             <input
              type="file"
              id="file_wikidata"
              accept=".tsv"
              style={{ display: "none" }}
              onChange={this.uploadWikidataFile.bind(this)}
              onClick={(event) => { (event.target as HTMLInputElement).value = '' }}
            />

            {/* hidden input of wikifier file */}
            <input
              type="file"
              id="file_wikifier"
              accept=".csv"
              style={{ display: "none" }}
              onChange={wikiStore.table.handleOpenWikifierFile}
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
