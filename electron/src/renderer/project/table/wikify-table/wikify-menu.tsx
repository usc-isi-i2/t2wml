import React from 'react';

import './wikify-menu.css';
import WikifyForm from './wikify-form';

import Draggable from 'react-draggable';
import { Toast } from 'react-bootstrap';
import { ErrorMessage } from '../../../common/general';
import * as utils from '../table-utils';


interface WikifyMenuProperties {
  selectedCell: Cell | null;
  position?: Array<number>,
  onDelete: any | null,
  onClose: any | null,
}


interface WikifyMenuState {
  errorMessage: ErrorMessage;
}


class WikifyMenu extends React.Component<WikifyMenuProperties, WikifyMenuState> {

  constructor(props: WikifyMenuProperties) {
    super(props);

    this.state = {
      errorMessage: {} as ErrorMessage,
    };
  }

  handleOnChange(key: string, value: string) {
    console.log('WikifyMenu OnChange triggered for -> ', key, value);
  }

  handleOnSubmit(values: { [key: string]: string }) {
    console.log('WikifyMenu OnSubmit triggered for -> ', values);
  }

  renderHeader() {
    const { selectedCell } = this.props;
    if (!selectedCell) { return null; }
    const { col, row } = selectedCell;
    return (
      <Toast.Header className="handle">
        <strong className="mr-auto">
          Selected: {utils.columnToLetter(col + 1)}{row + 1}
        </strong>
      </Toast.Header>
    )
  }

  renderWikifyForms() {
    return (
      <WikifyForm
        onChange={this.handleOnChange.bind(this)}
        onSubmit={this.handleOnSubmit.bind(this)} />
    )
  }

  render() {
    const { position, onClose } = this.props;
    return (
      <Draggable handle=".handle"
        defaultPosition={{x: position[0], y: position[1]}}>
        <div className="wikify-menu">
          <Toast onClose={onClose}>
            {this.renderHeader()}
            <Toast.Body>
              {this.renderWikifyForms()}
            </Toast.Body>
          </Toast>
        </div>
      </Draggable>
    )
  }
}


export default WikifyMenu
