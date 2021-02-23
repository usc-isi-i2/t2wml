import React, { Component } from 'react';

// App
import { Button, Col, Form, Modal, Row } from 'react-bootstrap';

import { observer } from "mobx-react";


interface SettingsProperties {
    showSettings: boolean;
    datamartIntegration: boolean;
    datamartApi: string;

    handleSaveSettings: (
      datamartIntegration: boolean,
      datamartApi: string,
    ) => void;
    cancelSaveSettings: () => void;
}

interface SettingsState {
  datamartIntegration: boolean;
  datamartApi: string;
}

@observer
class GlobalSettings extends Component<SettingsProperties, SettingsState> {
  constructor(props: SettingsProperties) {
    super(props);

    this.state = {
      datamartIntegration: this.props.datamartIntegration,
      datamartApi: this.props.datamartApi,
    }
  }

  handleSaveSettings(event:any) {
    if (event) { event.preventDefault() } //otherwise app reloads
    if (this.state.datamartIntegration && !this.state.datamartApi){
      return;
    }
    const datamartIntegration = this.state.datamartIntegration;
    const datamartApi = this.state.datamartApi;
    this.props.handleSaveSettings(datamartIntegration, datamartApi);
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
            {/* datamart integration on/off */}
            <Form.Group as={Row} style={{ marginTop: "1rem" }}>
              <Form.Label column sm="12" md="3" className="text-right">
              Turn Datamart Integration ON
              </Form.Label>
              <Col sm="12" md="9">
                <input type="checkbox"
                  style={{ width: '25px', height: '25px', marginTop: '5px' }}
                  defaultChecked={this.props.datamartIntegration}
                  onChange={(event) => this.setState({ datamartIntegration: event?.target.checked })}/>
              </Col>
            </Form.Group>

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
                   <Form.Label style={{ color: 'red' }}>
                      {this.state.datamartIntegration && !this.state.datamartApi ?  "Url cannot be empty if datamrt integration is checked":""}
                          </Form.Label>
              </Col>
            </Form.Group>
          </Form>

        </Modal.Body>

        {/* footer */}
        <Modal.Footer style={{ background: "whitesmoke" }}>
          <Button variant="outline-dark" onClick={handleClose}>
            Cancel
          </Button>
          <Button variant="dark" onClick={handleSave} disabled ={this.state.datamartIntegration && !this.state.datamartApi}>
            Save
          </Button>
        </Modal.Footer>

      </Modal>
    );
  }
}

export default GlobalSettings;
