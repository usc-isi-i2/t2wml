import React from 'react';

import './annotation-menu.css';

import Draggable from 'react-draggable';
import { Col, Form, Row, Toast } from 'react-bootstrap';


class AnnotationMenu extends React.Component {

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
              <strong className="mr-auto">annotate selection</strong>
            </Toast.Header>
            <Toast.Body>

              <Form className="container">

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

            </Toast.Body>
          </Toast>
        </Draggable>
      </div>
    )
  }
}


export default AnnotationMenu
