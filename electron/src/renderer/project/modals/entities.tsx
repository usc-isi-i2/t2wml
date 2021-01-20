import React, { Component } from 'react';
import '../project.css';
import '../ag-grid.css';
import '../ag-theme-balham.css';

// App
import { Button, Col, Form, Modal, Row } from 'react-bootstrap';

import { observer } from "mobx-react";


interface EntitiesProperties {
    showEntities: boolean;
    properties: any; //type

    handleSaveEntities: () => void;
    cancelSaveEntities: () => void;
}

interface EntitiesState {
}


@observer
class Entities extends Component<EntitiesProperties, EntitiesState> {
  constructor(props: EntitiesProperties) {
    super(props);

    this.state = {
    }
  }

  
  render() {
    return (
      <Modal show={this.props.showEntities} size="lg" onHide={() => { /* do nothing */ }}>

        {/* header */}
        <Modal.Header style={{ background: "whitesmoke" }}>
          <Modal.Title>Entities</Modal.Title>
        </Modal.Header>

        {/* body */}
        <Modal.Body>
          <Form className="container">
            <Form.Label>
              select a property to see its details
            </Form.Label>

            <Form.Group as={Row} style={{ marginTop: "1rem" }}>
              <Col sm="12" md="3" style={{backgroundColor: 'red'}}>
                <label>aaaaaaaaaaaaaaa</label>
              </Col>
              <Col sm="12" md="9" style={{backgroundColor: 'blue'}}>
                <label>eeeeeeeeeeeee</label>
              </Col>
            </Form.Group>

          </Form>

        </Modal.Body>

        {/* footer */}
        <Modal.Footer style={{ background: "whitesmoke" }}>
          <Button variant="outline-dark" onClick={() => this.props.cancelSaveEntities() }>
            Cancel
          </Button>
          <Button variant="dark" onClick={() => this.props.handleSaveEntities()}>
            Save
          </Button>
        </Modal.Footer>

      </Modal>
    );
  }
}

export default Entities;
