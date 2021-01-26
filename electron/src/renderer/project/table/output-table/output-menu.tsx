import React from 'react';

import './output-menu.css';

import Draggable from 'react-draggable';
import { Toast } from 'react-bootstrap';
import { ErrorMessage } from '../../../common/general';


interface OutputMenuProperties {
  selections?: Array<any>,
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

  render() {
    const { position, onClose } = this.props;
    return (
      <Draggable handle=".handle"
        defaultPosition={{x: position[0], y: position[1]}}>
        <div className="output-menu">
          <Toast onClose={onClose}>
            <Toast.Header className="handle">
              <strong className="mr-auto">Selected: </strong>
            </Toast.Header>
            <Toast.Body>
            </Toast.Body>
          </Toast>
        </div>
      </Draggable>
    )
  }
}


export default OutputMenu
