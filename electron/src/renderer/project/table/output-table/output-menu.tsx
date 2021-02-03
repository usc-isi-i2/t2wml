import React from 'react';

import './output-menu.css';

import Draggable from 'react-draggable';
import { Toast } from 'react-bootstrap';
import * as utils from '../table-utils';
import wikiStore from '../../../data/store';
import { Cell, CellSelection, ErrorMessage } from '../../../common/general';


interface OutputMenuProperties {
  selectedCell: Cell | null;
  position?: Array<number>,
  onDelete: any | null,
  onClose: any | null,
}


interface OutputMenuState {
  errorMessage: ErrorMessage;
}


class OutputMenu extends React.Component<OutputMenuProperties, OutputMenuState> {


  constructor(props: OutputMenuProperties) {
    super(props);

    this.state = {
      errorMessage: {} as ErrorMessage,
    };
  }

  renderHeader() {
    const { selectedCell } = this.props;

    let text = 'Selected:';
    const selection: CellSelection = {
      x1: selectedCell.col + 1,
      x2: selectedCell.col + 1,
      y1: selectedCell.row + 1,
      y2: selectedCell.row + 1,
    };
    text += ` ${utils.humanReadableSelection(selection)}`;

    return (
      <Toast.Header className="handle">
        <strong className="mr-auto">{text}</strong>
      </Toast.Header>
    )
  }

  renderQnode(qnode) {
    if ( qnode ) {
      return (
        <div className="qnode">
          <strong>{qnode.label}</strong> ({qnode.url ? (
            <a target="_blank"
              rel="noopener noreferrer"
              href={qnode.url}>
              {qnode.id}
            </a>
          ) : (
              <span>{qnode.id}</span>
            )})
          <br />
          <br />
          {qnode.description}
        </div>
      )
    }
  }

  renderError(error) {
    if ( error ) {
      error = error.error;
      if ( error ) {
        return Object.keys(error).map((key, i) => {
          return <p className="error" key={i}>{error[key].message}</p>
        });
      }
    }
  }

  renderBody() {
    const { selectedCell } = this.props;
    const qnode = wikiStore.layers.qnode.find(selectedCell);
    const error = wikiStore.layers.error.find(selectedCell);
    if ( qnode || error ) {
      return (
        <Toast.Body>
          {this.renderQnode(qnode)}
          {this.renderError(error)}
        </Toast.Body>
      )
    }
  }

  render() {
    const { position, onClose } = this.props;
    return (
      <Draggable handle=".handle"
        defaultPosition={{x: position[0], y: position[1]}}>
        <div className="output-menu">
          <Toast onClose={onClose}>
            {this.renderHeader()}
            {this.renderBody()}
          </Toast>
        </div>
      </Draggable>
    )
  }
}


export default OutputMenu
