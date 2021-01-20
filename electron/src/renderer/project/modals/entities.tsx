import React, { Component } from 'react';
import '../project.css';
import './ag-grid.css';
import './ag-theme-balham.css';

// App
import { Button, Col, Dropdown, Form, Modal, Row, InputGroup } from 'react-bootstrap';

import { observer } from "mobx-react";


interface EntitiesProperties {
    showEntities: boolean;

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
          <label>Entities modal...</label>

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
