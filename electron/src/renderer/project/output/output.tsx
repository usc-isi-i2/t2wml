import React, { Component } from 'react';

// App
import { Button, Card, Spinner } from 'react-bootstrap';

// console.log
import { LOG, ErrorMessage, t2wmlColors } from '../../common/general';
import RequestService, { IStateWithError } from '../../common/service';
import ToastMessage from '../../common/toast';

import { observer } from "mobx-react";
import wikiStore from '../../data/store';
import ShowOutput from './show-output';
import { reaction, IReactionDisposer } from 'mobx';
import { StatementEntry } from '@/renderer/common/dtos';
interface OutputComponentState extends IStateWithError {
  // statement
  statement?: StatementEntry;
  errors: string;

  // download
  filename: string;
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
      statement: undefined,
      errors: "",

      // download
      filename: "",
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
    this.disposers.push(reaction(() => wikiStore.layers.qnode, () => this.updateStateFromStore()));

  }

  componentWillUnmount() {
    for (const disposer of this.disposers) {
      disposer();
    }
  }



  updateStateFromStore() {
    this.setState({
      statement: undefined,
      errors: ""
    });

    if (!wikiStore.table.selectedCell || !wikiStore.table.selectedCell.row) { return; } //no cell selected
    const selectedCell = wikiStore.table.selectedCell;
    const error = wikiStore.layers.error.find(selectedCell);
    const statement = wikiStore.layers.statement.find(selectedCell);

    if (error) {
      this.setState({ errors: JSON.stringify(error.error) }); //TODO: fix to work better.
    }

    if (!statement) { return; }

    this.setState({ statement: statement });
  }




  render() {
    return (
      <div className="w-100 h-100 p-1" style={{height: "100vh"}}>
        {this.state.errorMessage.errorDescription ? <ToastMessage message={this.state.errorMessage} /> : null}

        <Card className="w-100 h-100 shadow-sm">

          {/* card header */}
          <Card.Header style={{ height: "40px", padding: "0.5rem 1rem", background: t2wmlColors.OUTPUT }}>

            {/* title */}
            <div
              className="text-white font-weight-bold d-inline-block text-truncate"
              style={{ width: "calc(100% - 290px)", cursor: "default" }}
            >Output</div>

          </Card.Header>

          {/* card body */}
          <Card.Body className="w-100 h-100 p-0" style={{ overflow: "auto" }}>

            {/* loading spinner */}
            <div className="mySpinner" hidden={!wikiStore.output.showSpinner}>
              <Spinner animation="border" />
            </div>

            {/* output */}
            <div className="w-100 p-3" style={{ height: "100px" }}>
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
