import React, { Component } from 'react';

// App
import { Card, Spinner } from 'react-bootstrap';

import {  ErrorMessage, t2wmlColors } from '@/renderer/common/general';
import { IStateWithError } from '@/renderer/common/service';
import ToastMessage from '@/renderer/common/toast';

import { observer } from "mobx-react";
import wikiStore from '@/renderer/data/store';
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

  constructor(props: {}) {
    super(props);

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
    this.disposers.push(reaction(() => wikiStore.table.selection.selectedCell, () => this.updateStateFromStore()));
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

    if (!wikiStore.table.selection.selectedCell || !wikiStore.table.selection.selectedCell.row) { return; } //no cell selected
    const selectedCell = wikiStore.table.selection.selectedCell;
    const error = wikiStore.layers.error.find(selectedCell);
    const statement = wikiStore.layers.statement.find(selectedCell);

    if (error) {
      this.setState({ errors: JSON.stringify(error.error) }); //TODO: fix to work better.
    }
    if (!statement) { return; }
    this.setState({ statement: statement });
  }


  render() {
    if (!this.state.statement){
      return null;
    }
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
            >Statement Preview</div>

          </Card.Header>

          {/* card body */}
          <Card.Body className="w-100 h-100 p-0" style={{ overflow: "auto" }}>

            {/* loading spinner */}
            <div className="mySpinner" hidden={!wikiStore.output.showSpinner}>
              <Spinner animation="border" />
            </div>

            {/* output */}
            <div className="w-100 p-3" style={{ height: "150px" }}>
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
