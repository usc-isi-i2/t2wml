import React, { Component } from 'react';

// App
import { Button, Card, Spinner } from 'react-bootstrap';

// Output
import Downloader from 'js-file-download';

// console.log
import { LOG, ErrorMessage } from '../../common/general';
import RequestService, { IStateWithError } from '../../common/service';
import ToastMessage from '../../common/toast';

import { observer } from "mobx-react";
import wikiStore from '../../data/store';
import Download from './download';
import ShowOutput from './show-output';
import { reaction, IReactionDisposer } from 'mobx';
import { StatementEntry } from '@/renderer/common/dtos';

interface OutputComponentState extends IStateWithError {
  // statement
  statement: StatementEntry | null
  errors: string;

  // download
  showDownload: boolean,
  isDownloading: boolean;
  isLoadDatamart: boolean;

  propertyName: string;
}

@observer
class Output extends Component<{}, OutputComponentState> {
  private requestService: RequestService;

  constructor(props: {}) {
    super(props);
    this.requestService = new RequestService();

    // init state
    this.state = {
      statement: null,
      errors: "",
      // download
      showDownload: false,
      isDownloading: false,
      isLoadDatamart: false,

      errorMessage: {} as ErrorMessage,
    } as OutputComponentState;
  }

  private disposers: IReactionDisposer[] = [];

  componentDidMount() {
    this.disposers.push(reaction(() => wikiStore.table.selectedCell, () => this.updateStateFromStore()));
    this.disposers.push(reaction(() => wikiStore.layers, () => this.updateStateFromStore()));
  }

  componentWillUnmount() {
    for (const disposer of this.disposers) {
      disposer();
    }
  }

  private get projectPath() {
    return wikiStore.projects.current!.folder;
  }

  async handleDoDownload(fileName: string, fileType: string) {
    const filename = fileName + "." + fileType;

    // before sending request
    this.setState({ isDownloading: true, showDownload: false });

    // send request
    console.debug("<Output> -> %c/download%c for file: %c" + filename, LOG.link, LOG.default, LOG.highlight);

    try {
      const json = await this.requestService.call(this, () => this.requestService.downloadResults(this.projectPath, fileType));
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
    } finally {
      this.setState({ isDownloading: false });
    }
  }

  cancelDownload() {
    this.setState({ showDownload: false });
  }



  updateStateFromStore() {
    this.setState({
      statement: null,
      errors: ""
    });

    if (!wikiStore.table.selectedCell || !wikiStore.table.selectedCell.row) { return; } //no cell selected
    const selectedCell = wikiStore.table.selectedCell;
    const error = wikiStore.layers.error.find(selectedCell.rowIndex, selectedCell.colIndex)
    const statement = wikiStore.layers.statement.find(selectedCell.rowIndex, selectedCell.colIndex)

    if (error) {
      this.setState({ errors: JSON.stringify(error.error) }); //TODO: fix to work better.
    }

    if (!statement) { return; }

    this.setState({ statement: statement });
  }



  async loadToDatamart() {
    // TODO !
    wikiStore.output.showSpinner = true;
    wikiStore.table.showSpinner = true;
    this.setState({ isLoadDatamart: true });
    console.log("Load to Datamart");
    try {
      const json = await this.requestService.call(this, () => this.requestService.loadToDatamart(this.projectPath))
      console.log(json);
      const { datamart_get_url, description } = json;
      if (datamart_get_url !== undefined) {
        alert("Success! To download the data in canonical format use this url:\n" + datamart_get_url)
        // prompt('Success! Use this url to download the data in canonical format:', datamart_get_url)
      } else {
        alert("Failed to load to Datamart\nError: " + description)
      }
    } catch (error: any) {
      console.log(error);
      const { errorTitle, errorDescription } = error;
      if (errorTitle !== undefined) {
        alert("Failed to load to Datamart\nError: " + errorTitle + "\nDescription: " + errorDescription);
        wikiStore.table.showSpinner = false;
      }
    }
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
              style={{ padding: "0rem 0.5rem", marginRight: "0.5rem" }}
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
                statement={this.state.statement}
                errors={this.state.errors}
              />
            </div>
          </Card.Body>
        </Card>
      </div>
    );
  }
}

export default Output;
