import React from 'react';

import './annotation-menu.css';
import * as utils from './table-utils';

import Draggable from 'react-draggable';
import { Col, Form, Row, Toast } from 'react-bootstrap';


class AnnotationMenu extends React.Component {

  renderAnnotationForms() {
    const { selections } = this.props;
    return selections.map((selection, index) => (
      <Form className="container" key={index}>
        <h7>{utils.humanReadableSelection(selection)}</h7>
        <Form.Group as={Row} style={{ marginTop: "1rem" }} onChange={(event: Event) => {
          this.setState({
            annotation: (event.target as HTMLInputElement).value,
          })
        }}>
          <Col sm="12" md="12">
            <Form.Control
              type="text"
              placeholder="annotation"
              autoFocus={true} />
          </Col>
        </Form.Group>
      </Form>
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
