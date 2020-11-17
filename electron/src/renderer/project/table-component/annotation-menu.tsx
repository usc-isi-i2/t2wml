import React from 'react';

import './annotation-menu.css';

import Draggable from 'react-draggable';
import { Toast } from 'react-bootstrap';


class AnnotationMenu extends React.Component {

  render() {
    const { onClose } = this.props;
    return (
      <div className="annotation-menu">
        <Draggable handle=".handle">
          <Toast onClose={onClose}>
            <Toast.Header className="handle">
              <strong className="mr-auto">annotate selection</strong>
            </Toast.Header>
            <Toast.Body>
            </Toast.Body>
          </Toast>
        </Draggable>
      </div>
    )
  }
}


export default AnnotationMenu
