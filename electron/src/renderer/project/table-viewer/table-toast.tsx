import React, { Component } from 'react';

// App
import {  Toast } from 'react-bootstrap';

import { Cell } from '../../common/general';

import { observer } from "mobx-react";
import wikiStore from '../../data/store';

interface TableToastProperties {
    selectedCell: Cell | null;
    showToast0: boolean;  // showing details of current cell
    showToast1: boolean;  // showing temperary messages
    msgInToast1: string,  // message shows in toast 1

    onCloseToast: (toastNum:string) => void;
}

@observer
class TableToast extends Component<TableToastProperties, {}> {

  renderToastBody() {
    // get qnodeData from wikifier, e.g. { "A1": "Q967", ... }
    if (wikiStore.qNodeData === undefined) return;
    const { qnodeData } = wikiStore.qNodeData;
    console.log("hi", qnodeData)
    debugger
    if (qnodeData === undefined) return;
    console.log("toast qnodedata", qnodeData)
    // get qnode according to cell index, e.g. "Q967"
    const { selectedCell } = this.props;

    if (selectedCell === null || selectedCell.col === null || selectedCell.row === null) return;
    const selectedCellIndex = String(selectedCell.col) + String(selectedCell.row);

    // fill in data
    console.log("selected qnode", qnodeData[selectedCellIndex] )
    if (qnodeData[selectedCellIndex] === undefined) return;
    const {id, url, label, description} = qnodeData[selectedCellIndex]
    // render qnode
    let idHref = url 

    const idHtml = (
      <a
        href={idHref}
        target="_blank"
        rel="noopener noreferrer"
        style={{ "color": "hsl(200, 100%, 30%)" }}
      >{id}</a>
    );

    return (
      <Toast.Body>
        <strong>{label}</strong>&nbsp;({idHtml})<br />
        <br />
        {description}
      </Toast.Body>
    );
  }

  render() {
    const { showToast0, showToast1, msgInToast1 } = this.props;
    const { selectedCell } = this.props;

    let msgInToast0;
    if (selectedCell === null) {
      msgInToast0 = "No cell selected";
    } else {
      msgInToast0 = "{ $col: " + selectedCell.col + ", $row: " + selectedCell.row + " }";
    }

    return (
    <div className="myToast">
        {/* toast 0: showing details of selected cell */}
        <Toast
        onClose={() => this.props.onCloseToast('showToast0')}
        style={showToast0 ? { display: "block" } : { display: "none" }}
        >
        <Toast.Header style={{ background: "whitesmoke" }}>
            <span className="mr-auto font-weight-bold">
            {msgInToast0}
            </span>
            <small>Pinned</small>
        </Toast.Header>
        {this.renderToastBody()}
        </Toast>

        {/* toast 1: showing message */}
        <Toast
            onClose={() => this.props.onCloseToast('showToast1')}
            autohide delay={7000}
            show={showToast1} // this "show" and the following "display: none", both are needed
            style={showToast1 ? { display: "block" } : { display: "none" }}
        >
        <Toast.Header style={{ background: "whitesmoke" }}>
            <span className="mr-auto font-weight-bold">
                {msgInToast1}
            </span>
        </Toast.Header>
        </Toast>
    </div>
    );
  }
}

export default TableToast;
