import React, { Component } from 'react';

// App
import { Button, Card, Spinner } from 'react-bootstrap';

// Output
import Downloader from 'js-file-download';

// console.log
import { LOG, ErrorMessage } from '../../common/general';
import * as utils from '../../common/utils'
import RequestService from '../../common/service';
import ToastMessage from '../../common/toast';

import { observer } from "mobx-react";
import wikiStore from '../../data/store';
import Download from './download';
import ShowOutput from './show-output';
import { reaction, IReactionDisposer } from 'mobx';

interface OutputComponentState {
  currCol: string;
  currRow: string;
  // data
  valueCol: string | null;
  valueRow: string | null;
  value: string | null;
  unitName: string | null;
  unitID: string | null;
  itemID: string | null;
  itemName: string | null;
  itemCol: string | undefined;
  itemRow: string | undefined;
  propertyID: string | null;
  qualifiers: any; //  null;
  errors: string;

  // download
  showDownload: boolean,
  isDownloadDisabled: boolean,
  isDownloading: boolean;
  isLoadDatamart: boolean;

  propertyName: string;
  errorMessage: ErrorMessage;
}

@observer
class Output extends Component<{}, OutputComponentState> {
  private requestService: RequestService;

  constructor(props: {}) {
    super(props);
    this.requestService = new RequestService();

    // init state
    this.state = {

      // data
      valueCol: null,
      valueRow: null,
      value: null,
      unitName: null,
      unitID: null,
      itemID: null,
      itemName: null,
      itemCol: undefined,
      itemRow: undefined,
      propertyID: null,
      qualifiers: null,
      errors: '',

      // download
      showDownload: false,
      isDownloadDisabled: wikiStore.output.isDownloadDisabled,
      isDownloading: false,
      isLoadDatamart: false,

      errorMessage: {} as ErrorMessage,
    } as OutputComponentState;


    // reaction(() => wikiStore.output.col, () => this.updateStateFromStore());
  }

  private disposers: IReactionDisposer[] = [];

  componentDidMount() {
    this.disposers.push(reaction(() => wikiStore.output.col, () => this.updateStateFromStore()));
    this.disposers.push(reaction(() => wikiStore.output.row, () => this.updateStateFromStore()));
    this.disposers.push(reaction(() => wikiStore.output.json, () => this.updateStateFromStore()));
  }

  componentWillUnmount() {
    for(const disposer of this.disposers) {
      disposer();
    }
  }

  private get projectPath() {
    return wikiStore.projects.current!.folder;
  }

  async handleDoDownload(fileName: string, fileType: string) {
    this.setState({ errorMessage: {} as ErrorMessage });
    const filename = fileName + "." + fileType;

    // before sending request
    this.setState({ isDownloading: true, showDownload: false });

    // send request
    console.debug("<Output> -> %c/download%c for file: %c" + filename, LOG.link, LOG.default, LOG.highlight);

    try {
      const json = await this.requestService.downloadResults(this.projectPath, fileType);
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

      // follow-ups (success)
      this.setState({ isDownloading: false });

    } catch (error) {
      //   console.log(error);
      error.errorDescription += "\n\nCannot download!";
      this.setState({ errorMessage: error });

      // follow-ups (failure)
      this.setState({ isDownloading: false });
    }
  }

  cancelDownload() {
    this.setState({ showDownload: false });
  }

  removeBorders() {
    // remove value border
    let col: string | undefined = this.state.currCol;
    let row: string | undefined = this.state.currRow;
    if (col !== undefined && row !== undefined) {
      wikiStore.table.updateStyleByCell(col, row, { "border": "" });
    }

    // remove item border
    col = this.state.itemCol;
    row = this.state.itemRow;
    if (col !== undefined && row !== undefined) {
      wikiStore.table.updateStyleByCell(col, row, { "border": "" });
    }

    // remove qualifier borders
    const qualifiers = this.state.qualifiers;
    if (qualifiers !== undefined && qualifiers != null) {
      for (let i = 0, len = qualifiers.length; i < len; i++) {
        col = qualifiers[i]["col"];
        row = qualifiers[i]["row"];
        if (col && row) {
          wikiStore.table.updateStyleByCell(col, row, { "border": "" });
        }
      }
    }
  }

  updateStateFromStore() {
     console.debug('output updateStateFromStore called ', JSON.stringify(wikiStore.output, null, 4));
    this.removeOutput();

    const json = wikiStore.output.json;
    const colName = wikiStore.output.col;
    const rowName = wikiStore.output.row;

    if(!wikiStore.output.showOutput) {
      return;
    }

    if(json["error"]) {
        this.setState({errors: JSON.stringify(json["error"])});
    }

    this.setState({
      valueCol: colName,
      valueRow: rowName,
    });
 
    if (json["statement"] === undefined) return;
    const qnodesLabel = json["qnodesLabels"];
 
    // item
    const itemID = json["statement"]["item"];
    // const itemName = window.TableViewer.state.rowData[row][col];
    this.setState({ itemID: itemID, itemName: qnodesLabel[itemID]["label"] });

    if (json["statement"]["cell"]) {
      const [col, row] = json["statement"]["cell"].match(/[a-z]+|[^a-z]+/gi);
      wikiStore.table.updateStyleByCell(col, row, { "border": "1px solid black !important" });
      this.setState({ itemCol: col, itemRow: row });
    }
    // property
    const propertyID = json["statement"]["property"];
    this.setState({ propertyID: propertyID, propertyName: qnodesLabel[propertyID]["label"] });
 
    // value
    const value = json["statement"]["value"];
    this.setState({ value: value });
    wikiStore.table.updateStyleByCell(colName, rowName, { "border": "1px solid hsl(150, 50%, 40%) !important" });
    this.setState({ currCol: colName, currRow: rowName });
 
    // unit
    if (json["statement"]["unit"]) {
      let unitName = json["statement"]["unit"];
      let unitID = null;
      if (qnodesLabel[unitName]) {
        unitID = unitName;
        unitName = qnodesLabel[unitName].label;
      }
      this.setState({ unitName: unitName, unitID: unitID });
    } else {
      this.setState({ unitName: null });
    }
 
    // qualifiers
    const statementQualifiers = json["statement"]["qualifier"];
    const qualifiers = [];
    if (statementQualifiers !== undefined) {
      for (const statementQualifier of statementQualifiers) {
        const qualifier: any = {};
 
        qualifier.propertyID = statementQualifier.property;
        qualifier.propertyName = qnodesLabel[qualifier.propertyID].label;
 
        qualifier.valueName = statementQualifier.value;
        if (/^[PQ]\d+$/.test(qualifier.valueName)) {
          qualifier.valueID = qualifier.valueName;
          qualifier.valueName = qnodesLabel[qualifier.valueName].label;
        }
 
        if (statementQualifier["cell"]) {
          const [q_col, q_row] = statementQualifier["cell"].match(/[a-z]+|[^a-z]+/gi);
          qualifier.col = q_col;
          qualifier.row = q_row;
          // let hue = utils.getHueByRandom(10); // first param is the total number of colors
          const hue = utils.getHueByQnode(10, qualifier["propertyID"]);
          wikiStore.table.updateStyleByCell(q_col, q_row, { "border": "1px solid hsl(" + hue + ", 100%, 40%) !important" });
        }
 
        qualifiers.push(qualifier);
      }
 
    }
    this.setState({ qualifiers: qualifiers });
  }

  removeOutput() {
    this.removeBorders();
    this.setState({
      valueCol: null,
      valueRow: null,
      value: null,
      unitName: null,
      unitID: null,
      itemID: null,
      itemName: null,
      itemCol: undefined,
      itemRow: undefined,
      propertyID: null,
      qualifiers: null,
      errors: '',
    });
  }


  loadToDatamart() {
    // TODO !
    wikiStore.output.showSpinner = true;
    wikiStore.table.showSpinner = true;
    this.setState({ isLoadDatamart: true });
    console.log("Load to Datamart");
    this.requestService.loadToDatamart(this.projectPath).then((json) => {
        console.log(json);
        const { datamart_get_url, description } = json;
        if (datamart_get_url !== undefined) {
            alert("Success! To download the data in canonical format use this url:\n" + datamart_get_url)
            // prompt('Success! Use this url to download the data in canonical format:', datamart_get_url)
        } else {
            alert("Failed to load to Datamart\nError: " + description)
        }
    }).catch((error: any) => {
        console.log(error);
        const { errorTitle, errorDescription } = error;
        if (errorTitle !== undefined) {
            alert("Failed to load to Datamart\nError: " + errorTitle +"\nDescription: " + errorDescription)
        }
    });
    this.setState({ isLoadDatamart: false });
    wikiStore.output.showSpinner = false;
    wikiStore.table.showSpinner = true;
  }

  render() {
    return (
      <div className="w-100 h-100 p-1">
        <Download showDownload={this.state.showDownload}
          handleDoDownload={(fileName: string, fileType: string) => this.handleDoDownload(fileName, fileType)}
          cancelDownload={() => this.cancelDownload()} />
        {this.state.errorMessage.errorDescription ? <ToastMessage message={this.state.errorMessage} /> : null}

        <Card className="w-100 h-100 shadow-sm">

          {/* card header */}
          <Card.Header style={{ height: "40px", padding: "0.5rem 1rem", background: "#990000" }}>

            {/* title */}
            <div
              className="text-white font-weight-bold d-inline-block text-truncate"
              style={{ width: "calc(100% - 290px)", cursor: "default" }}
            >Output</div>

            <Button
              className="d-inline-block float-right"
              variant="outline-light"
              size="sm"
              style={{ padding: "0rem 0.5rem" }}
              onClick={() => this.loadToDatamart()}
            >
              {this.state.isLoadDatamart ? <Spinner as="span" animation="border" size="sm" /> : "Load to Datamart"}
            </Button>

            {/* button to download */}
            <Button
              className="d-inline-block float-right"
              variant="outline-light"
              size="sm"
              style={{padding: "0rem 0.5rem", marginRight: "0.5rem" }}
              onClick={() => this.setState({ showDownload: true })}
              disabled={wikiStore.output.isDownloadDisabled || this.state.isDownloading}
            >
              {this.state.isDownloading ? <Spinner as="span" animation="border" size="sm" /> : "Download"}
            </Button>
          </Card.Header>

          {/* card body */}
          <Card.Body className="w-100 h-100 p-0" style={{ overflow: "auto" }}>

            {/* loading spinner */}
            <div className="mySpinner" hidden={!wikiStore.output.showSpinner}>
              <Spinner animation="border" />
            </div>

            {/* output */}
            <div className="w-100 p-3" style={{ height: "1px" }}>
              <ShowOutput
                errors={this.state.errors}
                itemName={this.state.itemName}
                itemID={this.state.itemID}
                propertyID={this.state.propertyID}
                propertyName={this.state.propertyName}
                value={this.state.value}
                unitID={this.state.unitID}
                unitName={this.state.unitName}
                qualifiers={this.state.qualifiers}
              />
            </div>
          </Card.Body>
        </Card>
      </div>
    );
  }
}

export default Output;
