import React, { Component } from 'react';

// App
import { Button, Col, Form, Modal, Row } from 'react-bootstrap';

import { observer } from "mobx-react";


interface SettingsProperties {
    showSettings: boolean;
    datamartApi: string;

    handleSaveSettings: (
      datamartApi: string,
    ) => void;
    cancelSaveSettings: () => void;
}

interface SettingsState {
  datamartApi: string;
}

@observer
class GlobalSettings extends Component<SettingsProperties, SettingsState> {
  constructor(props: SettingsProperties) {
    super(props);

    this.state = {
      datamartApi: this.props.datamartApi,
    }
  }

  handleSaveSettings(event:any) {
    if (event) { event.preventDefault() } //otherwise app reloads
    const datamartApi = this.state.datamartApi;
    this.props.handleSaveSettings(datamartApi);
  }

  render() {
    const handleClose= () => this.props.cancelSaveSettings()
    const handleSave = (event:any) => this.handleSaveSettings(event)
    return (
      <Modal show={this.props.showSettings} size="lg" onHide={handleClose}>

        {/* header */}
        <Modal.Header  closeButton style={{ background: "whitesmoke" }}>
          <Modal.Title>Global Settings</Modal.Title>
        </Modal.Header>

        {/* body */}
        <Modal.Body>
          <Form className="container" onSubmit={handleSave}>
            {/* datamart url */}
            <Form.Group as={Row}>
              <Form.Label column sm="12" md="3" className="text-right">
              Datamart api url
              </Form.Label>
              <Col sm="12" md="9">
                <Form.Control
                  type="text" size="sm"
                  defaultValue={this.props.datamartApi}
                  onChange={(event) => this.setState({ datamartApi: event?.target.value })}/>
              </Col>
            </Form.Group>
          </Form>

        </Modal.Body>

        {/* footer */}
        <Modal.Footer style={{ background: "whitesmoke" }}>
          <Button variant="outline-dark" onClick={handleClose}>
            Cancel
          </Button>
          <Button variant="dark" onClick={handleSave}>
            Save
          </Button>
        </Modal.Footer>

      </Modal>
    );
  }
}

export default GlobalSettings;
