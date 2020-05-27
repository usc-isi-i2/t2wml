import React, { Component } from 'react';

// App
import { Button, Card, Col, Form, Modal, OverlayTrigger, Row, Spinner, Tooltip } from 'react-bootstrap';

// Output
import Downloader from 'js-file-download';

// console.log
import { LOG } from '../common/general';
import * as utils from '../common/utils'
import RequestService from '../common/service';

interface OutputProperties {

}

interface OutputState {
  showSpinner: boolean,
  currCol: string;
  currRow: string;
  // data
  valueCol: string | null;
  valueRow: string | null;
  value: string | null;
  itemID: string | null;
  itemName: string | null;
  itemCol: string | undefined;
  itemRow: string | undefined;
  propertyID: string | null;
  qualifiers: any; //  null;
  cache: any; // cache for Wikidata queries

  // download
  showDownload: boolean,
  isDownloadDisabled: boolean,
  downloadFileName: string;
  downloadFileType: string;
  isDownloading: boolean;

  propertyName: string;
}

class Output extends Component<OutputProperties, OutputState> {
  private requestService: RequestService;
  
  constructor(props: OutputProperties) {
    super(props);
    this.requestService = new RequestService();

    // init global variables
    (window as any).Output = this;

    // init state
    this.state = {

      // appearance
      showSpinner: false,

      // data
      valueCol: null,
      valueRow: null,
      value: null,
      itemID: null,
      itemName: null,
      itemCol: undefined,
      itemRow: undefined,
      propertyID: null,
      qualifiers: null,
      cache: {}, // cache for Wikidata queries

      // download
      showDownload: false,
      isDownloadDisabled: true,
      downloadFileName: (window as any).pid,
      downloadFileType: "json",
      isDownloading: false,
    } as OutputState;
  }

  handleDoDownload() {
    const filename = this.state.downloadFileName + "." + this.state.downloadFileType;

    // before sending request
    this.setState({ isDownloading: true, showDownload: false });

    // send request
    console.log("<Output> -> %c/download%c for file: %c" + filename, LOG.link, LOG.default, LOG.highlight);
    this.requestService.download((window as any).pid, this.state.downloadFileType).then((json) => {
      console.log("<Output> <- %c/download%c with:", LOG.link, LOG.default);
      console.log(json);

      // do something here
      const { error } = json;

      // if failure
      if (error !== null) {
        throw Error(error);
      }

      // else, success
      const { data } = json;
      Downloader(data, filename);

      // follow-ups (success)
      this.setState({ isDownloading: false });

    }).catch((error) => {
      console.log(error);

      // follow-ups (failure)
      this.setState({ isDownloading: false });
    });
  }

  removeBorders() {
    // remove value border
    let col: string | undefined = this.state.currCol;
    let row: string | undefined = this.state.currRow;
    if (col !== undefined && row !== undefined) {
      (window as any).TableViewer.updateStyleByCell(col, row, { "border": "" });
    }

    // remove item border
    col = this.state.itemCol;
    row = this.state.itemRow;
    if (col !== undefined && row !== undefined) {
      (window as any).TableViewer.updateStyleByCell(col, row, { "border": "" });
    }

    // remove qualifier borders
    let qualifiers = this.state.qualifiers;
    if (qualifiers !== undefined && qualifiers != null) {
      for (let i = 0, len = qualifiers.length; i < len; i++) {
        col = qualifiers[i]["col"];
        row = qualifiers[i]["row"];
        (window as any).TableViewer.updateStyleByCell(col, row, { "border": "" });
      }
    }
  }

  updateOutput(colName: string, rowName: string, json: any) {
    if (json["statement"] === undefined) return;

    // remove current status
    this.removeOutput();

    this.setState({
      valueCol: colName,
      valueRow: rowName
    });

    // retrieve cache
    let { cache } = this.state;
    let isAllCached = true;

    // item
    const itemID = json["statement"]["item"];
    // const itemName = window.TableViewer.state.rowData[row][col];
    if (cache[itemID] !== undefined) {
      this.setState({ itemID: itemID, itemName: cache[itemID] });
    } else {
      this.setState({ itemID: itemID, itemName: "N/A" });
      this.queryWikidata(itemID, "itemName");
      isAllCached = false;
    }
    let [col, row] = json["statement"]["cell"].match(/[a-z]+|[^a-z]+/gi);
    (window as any).TableViewer.updateStyleByCell(col, row, { "border": "1px solid black !important" });
    this.setState({ itemCol: col, itemRow: row });

    // property
    const propertyID = json["statement"]["property"];
    if (cache[propertyID] !== undefined) {
      this.setState({ propertyID: propertyID, propertyName: cache[propertyID] });
    } else {
      this.setState({ propertyID: propertyID });
      this.queryWikidata(propertyID, "propertyName");
      isAllCached = false;
    }

    // value
    const value = json["statement"]["value"];
    this.setState({ value: value });
    (window as any).TableViewer.updateStyleByCell(colName, rowName, { "border": "1px solid hsl(150, 50%, 40%) !important" });
    this.setState({ currCol: colName, currRow: rowName });

    // qualifiers
    let temp = json["statement"]["qualifier"];
    let qualifiers = [];
    if (temp !== undefined) {
      for (let i = 0, len = temp.length; i < len; i++) {
        let qualifier: any = {};

        qualifier["propertyID"] = temp[i]["property"];
        if (cache[qualifier["propertyID"]] !== undefined) {
          qualifier["propertyName"] = cache[qualifier["propertyID"]];
        } else {
          this.queryWikidata(qualifier["propertyID"], "qualifiers", i, "propertyName");
          isAllCached = false;
        }

        qualifier["valueName"] = temp[i]["value"];
        if (/^[PQ]\d+$/.test(qualifier["valueName"])) {
          if (cache[qualifier["valueName"]] !== undefined) {
            qualifier["valueID"] = qualifier["valueName"];
            qualifier["valueName"] = cache[qualifier["valueName"]];
          } else {
            this.queryWikidata(qualifier["valueName"], "qualifiers", i, "valueName");
            isAllCached = false;
          }
        }

        if (temp[i]["cell"] !== undefined && temp[i]["cell"] !==null) {
          [col, row] = temp[i]["cell"].match(/[a-z]+|[^a-z]+/gi);
          qualifier["col"] = col;
          qualifier["row"] = row;
          // let hue = utils.getHueByRandom(10); // first param is the total number of colors
          let hue = utils.getHueByQnode(10, qualifier["propertyID"]);
          (window as any).TableViewer.updateStyleByCell(col, row, { "border": "1px solid hsl(" + hue + ", 100%, 40%) !important" });
        }

        qualifiers.push(qualifier);
      }
    }
    this.setState({ qualifiers: qualifiers });

    if (isAllCached) {
      this.setState({ showSpinner: false });
    }
  }

  removeOutput() {
    this.removeBorders();
    this.setState({
      valueCol: null,
      valueRow: null,
      value: null,
      itemID: null,
      itemName: null,
      itemCol: undefined,
      itemRow: undefined,
      propertyID: null,
      qualifiers: null,
    });
  }

  queryWikidata(node: string, field: string, index = 0, subfield = "propertyName") {
    // FUTURE: use <local stroage> to store previous query result even longer
    const api = (window as any).sparqlEndpoint + "?format=json&query=SELECT%20DISTINCT%20%2a%20WHERE%20%7B%0A%20%20wd%3A" + node + "%20rdfs%3Alabel%20%3Flabel%20.%20%0A%20%20FILTER%20%28langMatches%28%20lang%28%3Flabel%29%2C%20%22EN%22%20%29%20%29%20%20%0A%7D%0ALIMIT%201";
    // console.log("<Output> made query to Wikidata: " + api);

    // before send request
    this.setState({ showSpinner: true });

    // send both "no-cors" and default requests
    fetch(api)
      .then(response => response.json())
      .then(json => {
        try {
          const name = json["results"]["bindings"][0]["label"]["value"];
          if (field === "itemName") {
            this.setState({ itemName: name });
          } else if (field === "propertyName") {
            this.setState({ propertyName: name });
          } else if (field === "qualifiers") {
            let qualifiers = this.state.qualifiers;
            if (subfield === "propertyName") {
              qualifiers[index]["propertyName"] = name;
            } else if (subfield === "valueName") {
              qualifiers[index]["valueID"] = qualifiers[index]["valueName"];
              qualifiers[index]["valueName"] = name;
            }
            this.setState({ qualifiers: qualifiers });
          }
          let cache = this.state.cache;
          cache[node] = name;
          this.setState({ cache: cache, showSpinner: false });
        } catch (error) {
          // console.log(error)
          this.setState({ showSpinner: false });
        }
      });
  }

  renderDownload() {
    return (
      <Modal show={this.state.showDownload} onHide={() => { /* do nothing */ }}>

        {/* header */}
        <Modal.Header style={{ background: "whitesmoke" }}>
          <Modal.Title>Download</Modal.Title>
        </Modal.Header>

        {/* body */}
        <Modal.Body>
          <Form className="container">
            <Form.Group as={Row} style={{ marginTop: "1rem" }}>
              <Col xs="9" md="9" className="pr-0">
                <Form.Control
                  type="text"
                  defaultValue={this.state.downloadFileName}
                  onChange={(event) => this.setState({ downloadFileName: event.target.value })}
                />
              </Col>
              <Col xs="3" md="3" className="pl-0">
                <Form.Control as="select" onChange={(event) => this.setState({ downloadFileType: event.target.value })}>
                  <option value="json">.json</option>
                  <option value="ttl">.ttl</option>
                </Form.Control>
              </Col>
            </Form.Group>
          </Form>
        </Modal.Body>

        {/* footer */}
        <Modal.Footer style={{ background: "whitesmoke" }}>
          <Button variant="outline-dark" onClick={() => this.setState({ showDownload: false })}>
            Cancel
          </Button>
          <OverlayTrigger placement="bottom" trigger={["hover", "focus"]}
            // defaultShow="true"
            overlay={
              <Tooltip style={{ width: "fit-content" }} id="file">
                <div className="text-left small">
                  Your file will be prepared shortly. Once the file is ready, it will be downloaded automatically.
                </div>
              </Tooltip>
            }
          >
            <Button variant="dark" onClick={this.handleDoDownload.bind(this)}>
              Start
            </Button>
          </OverlayTrigger>

        </Modal.Footer>
      </Modal >
    );
  }

  renderOutput() {
    let outputDiv = [];
    let itemName = this.state.itemName;
    if (itemName) {

      // item
      let itemID = this.state.itemID;
      let itemIDDiv = (
        <a
          href={"https://www.wikidata.org/wiki/" + itemID}
          target="_blank"
          rel="noopener noreferrer"
          style={{ "color": "hsl(200, 100%, 30%)" }}
        >{itemID}</a>
      );

      // property
      let propertyDiv;
      let propertyID = this.state.propertyID;
      let propertyName = this.state.propertyName;
      if (propertyName) {
        propertyDiv =
          <span key="property">
            <a
              href={"https://www.wikidata.org/wiki/Property:" + propertyID}
              target="_blank"
              rel="noopener noreferrer"
              style={{ "color": "hsl(200, 100%, 30%)" }}
            >{propertyName}</a>
          </span>
          ;
      } else {
        propertyDiv =
          <span key="property">
            <a
              href={"https://www.wikidata.org/wiki/Property:" + propertyID}
              target="_blank"
              rel="noopener noreferrer"
              style={{ "color": "hsl(200, 100%, 30%)" }}
            >{propertyID}</a>
          </span>
          ;
      }

      // value
      let valueDiv = this.state.value;

      // qualifiers
      let qualifiersDiv = [];
      let qualifiers = this.state.qualifiers;
      if (qualifiers) {
        for (let i = 0, len = qualifiers.length; i < len; i++) {
          let qualifier = qualifiers[i];

          // qualifier property
          let qualifierPropertyDiv;
          let qualifierPropertyID = qualifier["propertyID"];
          let qualifierPropertyName = qualifier["propertyName"];
          if (qualifierPropertyName) {
            qualifierPropertyDiv =
              <a
                href={"https://www.wikidata.org/wiki/Property:" + qualifierPropertyID}
                target="_blank"
                rel="noopener noreferrer"
                style={{ "color": "hsl(200, 100%, 30%)" }}
                key="qualifierProperty"
              >{qualifierPropertyName}</a>
              ;
          } else {
            qualifierPropertyDiv =
              <a
                href={"https://www.wikidata.org/wiki/Property:" + qualifierPropertyID}
                target="_blank"
                rel="noopener noreferrer"
                style={{ "color": "hsl(200, 100%, 30%)" }}
                key="qualifierProperty"
              >{qualifierPropertyID}</a>
              ;
          }

          // qualifier value
          let qualifierValueDiv;
          let qualifierValueID = qualifier["valueID"];
          let qualifierValueName = qualifier["valueName"];
          if (qualifierValueID) {
            qualifierValueDiv =
              <a
                href={"https://www.wikidata.org/wiki/" + qualifierValueID}
                target="_blank"
                rel="noopener noreferrer"
                style={{ "color": "hsl(200, 100%, 30%)" }}
                key="qualifierValue"
              >{qualifierValueName}</a>
              ;
          } else {
            qualifierValueDiv = qualifierValueName;
          }

          // append to qualifiersDiv
          qualifiersDiv.push(
            <div key={i}>- {qualifierPropertyDiv}: {qualifierValueDiv}</div>
          );
        }
      }

      // final output
      outputDiv.push(
        <Card.Title key="item">
          <span style={{ fontSize: "24px", fontWeight: "bolder" }}>
            {itemName}
          </span>
          &nbsp;
          <span style={{ fontSize: "20px" }}>
            ({itemIDDiv})
          </span>
        </Card.Title>
      );
      outputDiv.push(
        <table className="w-100" key="outputTable" style={{ borderCollapse: "collapse" }}>
          <tbody>
            <tr style={{ borderTop: "1px solid lightgray", borderBottom: "1px solid lightgray" }}>
              <td className="p-2" style={{ fontSize: "16px", fontWeight: "bold", verticalAlign: "top", width: "40%" }}>
                {propertyDiv}
              </td>
              <td className="p-2">
                <div style={{ fontSize: "16px", fontWeight: "bold" }}>
                  {valueDiv}
                </div>
                <div style={{ fontSize: "14px" }}>
                  {qualifiersDiv}
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      );
    }
    return outputDiv;
  }

  render() {
    return (
      <div className="w-100 h-100 p-1">
        {this.renderDownload()}

        <Card className="w-100 h-100 shadow-sm">

          {/* card header */}
          <Card.Header style={{ height: "40px", padding: "0.5rem 1rem", background: "#990000" }}>

            {/* title */}
            <div
              className="text-white font-weight-bold d-inline-block text-truncate"
              style={{ width: "calc(100% - 90px)", cursor: "default" }}
            >Output</div>

            {/* button to download */}
            <Button
              className="d-inline-block float-right"
              variant="outline-light"
              size="sm"
              style={{ padding: "0rem 0.5rem", width: "83px" }}
              onClick={() => this.setState({ showDownload: true, downloadFileType: "json" })}
              disabled={this.state.isDownloadDisabled || this.state.isDownloading}
            >
              {this.state.isDownloading ? <Spinner as="span" animation="border" size="sm" /> : "Download"}
            </Button>
          </Card.Header>

          {/* card body */}
          <Card.Body className="w-100 h-100 p-0" style={{ overflow: "auto" }}>

            {/* loading spinner */}
            <div className="mySpinner" hidden={!this.state.showSpinner}>
              <Spinner animation="border" />
            </div>

            {/* output */}
            <div className="w-100 p-3" style={{ height: "1px" }}>
              {this.renderOutput()}
            </div>
          </Card.Body>
        </Card>
      </div>
    );
  }
}

export default Output;
