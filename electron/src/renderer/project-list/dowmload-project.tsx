import React, {Component} from 'react';

import { Button, Col, Form, Modal, Row } from 'react-bootstrap';

interface DownloadProperties {
  showDownloadProject: boolean;

  handleDownloadProject: () => void;
  cancelDownloadProject: () => void;
}


class DownloadProject extends Component<DownloadProperties, {}> {

  render() {
    return (
      <Modal show={this.props.showDownloadProject} onHide={() => { /* do nothing */ }}>

        {/* header */}
        <Modal.Header style={{ background: "whitesmoke" }}>
          <Modal.Title>Download&nbsp;Project</Modal.Title>
        </Modal.Header>

        {/* body */}
        <Modal.Body>
          <Form className="container">
            <Form.Group as={Row} style={{ marginTop: "1rem" }}>
              <Col sm="12" md="12">
                <Form.Control
                  plaintext
                  readOnly
                  defaultValue={"Feature not available"}
                  // defaultValue={"It might take some time to gather and compress files..."}
                />
              </Col>
            </Form.Group>
          </Form>
        </Modal.Body>

        {/* footer */}
        <Modal.Footer style={{ background: "whitesmoke" }}>
          <Button variant="outline-dark" onClick={() => this.props.cancelDownloadProject()} >
            Cancel
          </Button>
          <Button variant="dark" onClick={() => this.props.handleDownloadProject()} disabled>
            Start
          </Button>
        </Modal.Footer>

      </Modal>
    );
  }
}

export default DownloadProject;
