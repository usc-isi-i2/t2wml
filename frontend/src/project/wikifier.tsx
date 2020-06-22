import React, { Component, Fragment } from 'react';

// App
import { Button, Card, Col, Form, Modal, OverlayTrigger, Row, Spinner, Tooltip } from 'react-bootstrap';

// Table
import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/dist/styles/ag-grid.css';
import 'ag-grid-community/dist/styles/ag-theme-balham.css';

// console.log
import { LOG, WikifierData, ErrorMessage } from '../common/general';
import * as utils from '../common/utils'

import QnodeEditor from './qnode-editor';
import RequestService from '../common/service';
import ToastMessage from '../common/toast';

import { observer } from "mobx-react"
import wikiStore from '../data/store';

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
}

@observer
class Wikifier extends Component<WikifierProperties, WikifierState> {
  public gridApi: any;
  public gridColumnApi: any;

  private requestService: RequestService

  private tempWikifyRegionRef: React.RefObject<HTMLInputElement>;
  private tempWikifyFlagRef: React.RefObject<HTMLSelectElement>;
  private tempWikifyContextRef: React.RefObject<HTMLInputElement>;

  constructor(props: WikifierProperties) {
    super(props);
    this.requestService = new RequestService();
    this.tempWikifyRegionRef = React.createRef();
    this.tempWikifyFlagRef = React.createRef();
    this.tempWikifyContextRef = React.createRef();

    // init global variables
    (window as any).Wikifier = this;

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
    };
  }

  onGridReady(params: WikifierData) {
    // store the api
    this.gridApi = params.api;
    this.gridColumnApi = params.columnApi;
    // console.log("<Wikifier> inited ag-grid and retrieved its API");

    // FOR TEST ONLY
    // const qnodeData = { "A1": { "Context 1": { "item": "Q967", "label": "label", "desc": "dsc" }, "Context 2": { "item": "Q971", "label": "label", "desc": "dsc" } }, "B1": { "Context 1": { "item": "Q97", "label": "label", "desc": "dsc" }, "Context 2": { "item": "Q67", "label": "label", "desc": "dsc" } }, "C1": { "Context 1": { "item": "Q9", "label": "label", "desc": "dsc" } }, "D1": { "Context 3": { "item": "Q967", "label": "label", "desc": "dsc" } } };
    // const rowData = [{ "context": "country", "col": "A", "row": "148989", "value": "Burundi", "item": "Q967", "label": "Burundi", "desc": "country in ..." }, { "context": "country", "col": "B", "row": "1", "value": "Bundi", "item": "Q967", "label": "Burundi", "desc": "country in ..." }, { "context": "", "col": "D", "row": "1", "value": "Burundi", "item": "Q967", "label": "Burundi", "desc": "country in ..." }, { "context": "city", "col": "C", "row": "1", "value": "Bu", "item": "Q967", "label": "Burundi", "desc": "country in ..." }];
    // this.updateWikifier(qnodeData, rowData);

    this.gridApi.sizeColumnsToFit();

    // default sort
    const defaultSortModel = [
      { colId: "col", sort: "asc" },
      { colId: "row", sort: "asc" }
    ];
    params.api.setSortModel(defaultSortModel);
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

  handleDoCall() {
    const region = (this.tempWikifyRegionRef as any).current.value.trim();
    const flag = (this.tempWikifyFlagRef as any).current.value;
    const context = (this.tempWikifyContextRef as any).current.value.trim();

    // validate input
    if (!/^[a-z]+\d+:[a-z]+\d+$/i.test(region) || !utils.isValidRegion(region)) {
      alert("Error: Invalid region.\n\nRegion must:\n* be defined as A1:B2, etc.\n* start from top left cell and end in bottom right cell.");
      return;
    }

    // before sending request

    // this.setState({
    //   showSpinner: true,
    //   showCallWikifier: false
    // });
    this.setState({
      showCallWikifier: false
    });
    wikiStore.wikifier.showSpinner = true;

    // send request
    console.log("<Wikifier> -> %c/call_wikifier_service%c to wikify region: %c" + region, LOG.link, LOG.default, LOG.highlight);
    let formData = new FormData();
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
      if (error !== null) {
        throw Error(error);
      }

      // else, success

      const { qnodes, rowData } = json;
      (window as any).TableViewer.updateQnodeCells(qnodes, rowData);

      // follow-ups (success)
    //   this.setState({ showSpinner: false });
      wikiStore.wikifier.showSpinner = false;

    }).catch((error: ErrorMessage) => {
      console.log(error);
      error.errorDescription += "\n\nCannot call wikifier servie!";
      this.setState({ errorMessage: error });

      // follow-ups (failure)
      (window as any).TableViewer.updateQnodeCells();
    //   this.setState({ showSpinner: false });
        wikiStore.wikifier.showSpinner = false;
    });
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

  tableColComparator(col1: string, col2: string) {
    const col1Idx = utils.colName2colIdx(col1);
    const col2Idx = utils.colName2colIdx(col2);
    return col1Idx - col2Idx;
  }

  tableRowComparator(row1: string, row2: string) {
    const row1Idx = parseInt(row1);
    const row2Idx = parseInt(row2);
    return row1Idx - row2Idx;
  }

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

//   (wikiStore.wikifier as any).updateWikifier = (qnodeData = {}, rowData = []) => {
//     // update
//     this.setState({
//       qnodeData: qnodeData,
//       rowData: rowData,
//     });
//   }
updateWikifier(qnodeData = {}, rowData = []) {
    // update
    // this.setState({
    //   qnodeData: qnodeData,
    //   rowData: rowData,
    // });
    this.setState({
        rowData: rowData,
    });
    if (wikiStore.wikifier.state) {
       wikiStore.wikifier.state.qnodeData = qnodeData;
    }
  }

  renderCallWikifier() {
    return (
      <Modal show={this.state.showCallWikifier} onHide={() => { /* do nothing */ }}>

        {/* header */}
        <Modal.Header style={{ background: "whitesmoke" }}>
          <Modal.Title>Wikify region</Modal.Title>
        </Modal.Header>

        {/* body */}
        <Modal.Body>
          <Form className="container">

            {/* region */}
            <Form.Group as={Row} style={{ marginTop: "1rem" }}>
              <Form.Label column sm="12" md="3" className="text-right">
                Region
              </Form.Label>
              <Col xs="9" md="9" className="pr-0">
                <Form.Control
                  type="text"
                  ref={this.tempWikifyRegionRef}
                  placeholder="e.g. A1:A10"
                />
              </Col>
            </Form.Group>

            {/* flag */}
            <Form.Group as={Row} style={{ marginTop: "1rem" }}>
              <Form.Label column sm="12" md="3" className="text-right">
                Flag
              </Form.Label>
              <Col xs="9" md="9" className="pr-0">
                <Form.Control
                  as="select"
                  ref={this.tempWikifyFlagRef}
                >
                  <option value="0">{"record col & row"}</option>
                  <option value="1">{"record col"}</option>
                  <option value="2">{"record row"}</option>
                  <option value="3">{"don't record"}</option>
                </Form.Control>
              </Col>
            </Form.Group>

            {/* context */}
            <Form.Group as={Row} style={{ marginTop: "1rem" }}>
              <Form.Label column sm="12" md="3" className="text-right">
                Context
              </Form.Label>
              <Col xs="9" md="9" className="pr-0">
                <Form.Control
                  type="text"
                  ref={this.tempWikifyContextRef}
                  placeholder="(optional)"
                />
              </Col>
            </Form.Group>

          </Form>
        </Modal.Body>

        {/* footer */}
        <Modal.Footer style={{ background: "whitesmoke" }}>
          <Button variant="outline-dark" onClick={() => this.setState({ showCallWikifier: false })}>
            Cancel
          </Button>
          <Button variant="dark" onClick={this.handleDoCall.bind(this)}>
            Wikify
          </Button>
        </Modal.Footer>
      </Modal >
    );
  }

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

  renderWikifierOutput() {
    const { rowData } = this.state;
    return (
      <AgGridReact
        onGridReady={this.onGridReady.bind(this)}
        frameworkComponents={{
          qnodeEditor: QnodeEditor
        }}
        columnDefs={[
          {

            headerName: "",
            children: [
              { headerName: "context", field: "context", width: 60 }
            ]
          },
          {
            headerName: "Table",
            children: [
              { headerName: "col", field: "col", width: 60, comparator: this.tableColComparator, sortable: true },
              { headerName: "row", field: "row", width: 60, comparator: this.tableRowComparator, sortable: true },
              { headerName: "value", field: "value", width: 80 },
            ]
          },
          {
            headerName: "Wikidata",
            children: [
              {

                headerName: "item", field: "item", width: 60,
                cellStyle: { color: "hsl(200, 100%, 30%)" },
                // **** QNODE EDITOR ************************************************
                // editable: true, cellEditor: "qnodeEditor",
                // onCellValueChanged: (params) => { this.handleUpdateQnode(params) }
                // ******************************************************************
              },
              { headerName: "label", field: "label", width: 80 },
              { headerName: "description", field: "desc", width: 160 }
            ]
          }
        ]}
        rowData={rowData}
        suppressScrollOnNewData={true}
        headerHeight={18}
        rowHeight={18}
        rowStyle={{ background: "white" }}
        defaultColDef={{
          minWidth: 40,
          lockPosition: true,
          resizable: true,
          sortable: false,
        }}
      >
      </AgGridReact>
    );
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

    return (
    <Fragment>
        {this.state.errorMessage.errorDescription ? <ToastMessage message={this.state.errorMessage}/> : null }
    
        <Card
            className="w-100 shadow-sm"
            style={(this.props.isShowing) ? { height: "calc(100% - 40px)" } : { height: "40px" }}
        >

            {this.renderCallWikifier()}

            {/* header */}
            <Card.Header
            style={{ height: "40px", padding: "0.5rem 1rem", background: "#006699" }}
            onClick={() => wikiStore.editors.nowShowing = "Wikifier" }
            >

            {/* title */}
            <div
                className="text-white font-weight-bold d-inline-block text-truncate"

                // style={{ width: "calc(100% - 75px)", cursor: "default" }}
                style={{ width: "calc(100% - 150px)", cursor: "default" }}
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
                onClick={() => { document!.getElementById("file_wikifier")!.click(); }}
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

            </Card.Header>

            {/* wikifier */}
            <Card.Body
            className="w-100 h-100 p-0"
            style={
                // (this.props.isShowing) ? { overflow: "hidden" } : { display: "none" }
                { display: "flex", overflow: "hidden" }
            }
            >

            {/* loading spinner */}
            {/* <div className="mySpinner" hidden={!this.state.showSpinner} style={(this.props.isShowing) ? {} : { display: "none" }}>
                <Spinner animation="border" />
            </div> */}

            <div className="mySpinner" hidden={!wikiStore.wikifier.showSpinner} style={(this.props.isShowing) ? {} : { display: "none" }}>
                <Spinner animation="border" />
            </div>


            {/* wikifier output */}
            <div
                className="ag-theme-balham w-100 h-100"
                style={{
                display: "inline-block",
                overflow: "hidden"
                }}
            >
                {this.renderWikifierOutput()}
            </div>
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
