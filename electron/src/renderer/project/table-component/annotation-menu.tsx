import React from 'react';

import './annotation-menu.css';
import AnnotationForm from './annotation-form';

import Draggable from 'react-draggable';
import { Toast } from 'react-bootstrap';


class AnnotationMenu extends React.Component {

  handleOnChange(selection, input, value) {
    console.log(selection, input, value)
  }

  renderAnnotationForms() {
    const { selections } = this.props;
    return selections.map((selection, index) => (
      <AnnotationForm
        key={index}
        selection={selection}
        onChange={this.handleOnChange.bind(this)} />
    ));
  }

  render() {
    const { position, onClose } = this.props;
    const style = {
      'left': position[0],
      'top': position[1],
    };
    return (
      <div className="annotation-menu" style={style}>
        <Draggable handle=".handle">
          <Toast onClose={onClose}>
            <Toast.Header className="handle">
              <strong className="mr-auto">Annotate selected areas</strong>
            </Toast.Header>
            <Toast.Body>
              {this.renderAnnotationForms()}
            </Toast.Body>
          </Toast>
        </Draggable>
      </div>
    )
  }
}


export default AnnotationMenu
