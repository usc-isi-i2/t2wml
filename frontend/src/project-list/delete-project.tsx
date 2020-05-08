import React, {Component} from 'react';

import { Button, Col, Form, Modal, Row } from 'react-bootstrap';

interface DeleteProperteis {
  // pid: number; Is it needed?
  showDeleteProject: boolean;

  handleDeleteProject :Function;
  cancelDeleteProject :Function;
}


class DeleteProject extends Component<DeleteProperteis> {

  render() {
    return (
      <Modal show={this.props.showDeleteProject} onHide={() => { /* do nothing */ }}>

        {/* header */}
        <Modal.Header style={{ background: "whitesmoke" }}>
          <Modal.Title>Delete&nbsp;Project</Modal.Title>
        </Modal.Header>

        {/* body */}
        <Modal.Body>
          <Form className="container">
            <Form.Group as={Row} style={{ marginTop: "1rem" }}>
              <Col sm="12" md="12">
                <Form.Control
                  plaintext
                  readOnly
                  defaultValue={"You are about to delete this project..."}
                />
              </Col>
            </Form.Group>
          </Form>
        </Modal.Body>

        {/* footer */}
        <Modal.Footer style={{ background: "whitesmoke" }}>
        <Button variant="outline-dark" onClick={() => this.props.cancelDeleteProject()}>
        {/* <Button variant="outline-dark" onClick={(this) => this.props.cancelDeleteProject(this.props.pid)}> */}
            Cancel
          </Button>
          <Button variant="danger" onClick={() => this.props.handleDeleteProject()} style={{ backgroundColor: "#990000", borderColor: "#990000" }}>
            Confirm
          </Button>
        </Modal.Footer>
      </Modal>
    );
  }
}

export default DeleteProject;
