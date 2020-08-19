import React, { Component } from 'react';
import './project.css';
import './ag-grid.css'
import './ag-theme-balham.css'


// App
import { Button, Col, Dropdown, Form, Modal, Row, InputGroup } from 'react-bootstrap';

import Config from '../common/config';

import { observer } from "mobx-react";
import wikiStore from '../data/store';

interface SettingsProperties {
    showSettings: boolean;

    handleSaveSettings: () => void;
    cancelSaveSettings: () => void;
}

interface SettingsState {
  warnEmpty: boolean;
}

@observer
class Settings extends Component<SettingsProperties, SettingsState> {
  private tempSparqlEndpointRef: React.RefObject<HTMLInputElement>;

  constructor(props: SettingsProperties) {
    super(props);
    this.tempSparqlEndpointRef = React.createRef();

    this.state = {
      warnEmpty: false,
    }
  }

  handleSaveSettings() {
    wikiStore.settings.sparqlEndpoint = (this.tempSparqlEndpointRef as any).current.value;
    wikiStore.settings.warnEmpty = this.state.warnEmpty;
    this.props.handleSaveSettings();
  }


  render() {
    const sparqlEndpoints = [
      Config.sparql,
      "https://query.wikidata.org/sparql"
    ];
    return (
      <Modal show={this.props.showSettings} size="lg" onHide={() => { /* do nothing */ }}>

        {/* header */}
        <Modal.Header style={{ background: "whitesmoke" }}>
          <Modal.Title>Settings</Modal.Title>
        </Modal.Header>

        {/* body */}
        <Modal.Body>
          <Form className="container">

            {/* sparql endpoint */}
            <Form.Group as={Row} style={{ marginTop: "1rem" }}>
              <Form.Label column sm="12" md="3" className="text-right">
                SPARQL&nbsp;endpoint
              </Form.Label>
              <Col sm="12" md="9">
                <Dropdown as={InputGroup} alignRight>
                  <Form.Control
                    type="text"
                    defaultValue={wikiStore.settings.sparqlEndpoint}
                    ref={this.tempSparqlEndpointRef}
                    onKeyDown={(event: any) => event.stopPropagation()} // or Dropdown would get error
                  />
                  <Dropdown.Toggle split variant="outline-dark" id="endpoint"/>
                  <Dropdown.Menu style={{ width: "100%" }}>
                    <Dropdown.Item onClick={() => (this.tempSparqlEndpointRef as any).current.value = sparqlEndpoints[0]}>{sparqlEndpoints[0]}</Dropdown.Item>
                    <Dropdown.Item onClick={() => (this.tempSparqlEndpointRef as any).current.value = sparqlEndpoints[1]}>{sparqlEndpoints[1]}</Dropdown.Item>
                  </Dropdown.Menu>
                </Dropdown>
              </Col>
            
              <Form.Label column sm="12" md="3" className="text-right">
                Warn for empty cells
              </Form.Label>
              <Col sm="12" md="9">
              
                <input type="checkbox" 
                  style={{ width: '25px', height: '25px', marginTop: '5px' }}
                  defaultChecked={(this.state.warnEmpty)}
                  onChange={(event) => this.setState({ warnEmpty: event?.target.checked })}/>
              </Col>
            </Form.Group>
            
          </Form>
        </Modal.Body>

        {/* footer */}
        <Modal.Footer style={{ background: "whitesmoke" }}>
          <Button variant="outline-dark" onClick={() => this.props.cancelSaveSettings() }>
            Cancel
          </Button>
          <Button variant="dark" onClick={() => this.handleSaveSettings()}>
            Save
          </Button>
        </Modal.Footer>

      </Modal >
    );
  }
}

export default Settings;
