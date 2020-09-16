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
    if (wikiStore.wikifier === undefined || wikiStore.wikifier.state === undefined) return;
    const { qnodeData } = wikiStore.wikifier.state;
    if (qnodeData === undefined) return;

    // get qnode according to cell index, e.g. "Q967"
    const { selectedCell } = this.props;

    if (selectedCell === null || selectedCell.col === null || selectedCell.row === null) return;
    const selectedCellIndex = String(selectedCell.col) + String(selectedCell.row);

    // fill in data
    if (qnodeData[selectedCellIndex] === undefined) return;
    const contexts = Object.keys(qnodeData[selectedCellIndex]);
    if (contexts.length === 0) return;
    const items = [], labels = [], descs = [];
    for (let i = 0; i < contexts.length; i++) {
      items.push(qnodeData[selectedCellIndex][contexts[i]]["item"]);
      labels.push(qnodeData[selectedCellIndex][contexts[i]]["label"]);
      descs.push(qnodeData[selectedCellIndex][contexts[i]]["description"]);
    }

    // render qnode
    let itemHref;
    const itemType = items[0].match(/[a-z]+|\d+/gi)[0];
    if (itemType.charAt(itemType.length - 1) === "Q") {
      itemHref = "https://www.wikidata.org/wiki/" + items[0];
    } else {
      itemHref = "https://www.wikidata.org/wiki/Property:" + items[0];
    }

    const itemHtml = (
      <a
        href={itemHref}
        target="_blank"
        rel="noopener noreferrer"
        style={{ "color": "hsl(200, 100%, 30%)" }}
      >{items[0]}</a>
    );

    return (
      <Toast.Body>
        <strong>{labels[0]}</strong>&nbsp;({itemHtml})<br />
        <br />
        {descs[0]}
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
