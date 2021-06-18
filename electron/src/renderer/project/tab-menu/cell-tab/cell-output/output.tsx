import React, { Component } from 'react';

// App
import { Card, Spinner } from 'react-bootstrap';

import { t2wmlColors } from '../../../../common/general';

import { observer } from "mobx-react";
import wikiStore from '../../../../data/store';
import ShowOutput from './show-output';
import { reaction, IReactionDisposer } from 'mobx';
import { StatementEntry, Error } from '@/renderer/common/dtos';
interface OutputComponentState {
  // statement
  statement?: StatementEntry;
  error?: Error;

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
      error: undefined,

      // download
      filename: "",
      showDownload: false,
      isDownloading: false,
      isLoadDatamart: false,
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
      error: undefined
    });

    if (!wikiStore.table.selectedCell || !wikiStore.table.selectedCell.row) { return; } //no cell selected
    const selectedCell = wikiStore.table.selectedCell;
    const errors = wikiStore.layers.error.find(selectedCell);
    const statement = wikiStore.layers.statement.find(selectedCell);

    if (errors) {
      this.setState({ error: errors.error[0] }); //TODO: fix to work better.
    }
    if (!statement) { return; }
    this.setState({ statement: statement });
  }


  render() {
    const { statement, error } = this.state;

    let message = ""
    if (error){
      if ( error.message ){
        message = error.message
      }
    }
    return (
      <div className="w-100 h-100 p-1" style={{ height: "100vh" }}>

        <Card className="w-100 h-100 shadow-sm">

          {/* card header */}
          <Card.Header style={{ height: "40px", padding: "0.5rem 1rem", background: t2wmlColors.OUTPUT }}>

            {/* title */}
            <div
              className="text-white font-weight-bold d-inline-block text-truncate"
              style={{ width: "calc(100% - 20px)", cursor: "default" }}>
              Statement Preview
            </div>

          </Card.Header>

          {/* card body */}
          <Card.Body className="w-100 h-100 p-0" style={{ overflow: "auto" }}>

            {/* loading spinner */}
            <div className="mySpinner" hidden={!wikiStore.output.showSpinner}>
              <Spinner animation="border" />
            </div>

            {
              !statement && wikiStore.table.selectedBlock?.role == "dependentVar" ?
                (
                  <div className="w-100 p-3"
                    style={{ height: "150px", color: 'red', fontSize: "14px", fontWeight: "bold"}}>
                    { "There is no statement to display" }
                      <br/>
                    { message }
                  </div>
                )
                :
                (
                  // output
                  <div className="w-100 p-3" style={{ height: "150px" }}>
                    <ShowOutput statement={statement}/>
                  </div>
                )
            }
          </Card.Body>
        </Card>
      </div>
    );
  }
}

export default Output;
