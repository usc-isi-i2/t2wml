import React, { Component } from 'react';
import './project.css';
import './ag-grid.css'
import './ag-theme-balham.css'


// App
import { Button, Col, Dropdown, Form, Modal, Row, InputGroup } from 'react-bootstrap';

import Config from '@/shared/config';

import { observer } from "mobx-react";

interface SettingsProperties {
    showSettings: boolean;
    endpoint: string;
    warnEmpty: boolean;
    calendar: string;

    handleSaveSettings: (endpoint: string, warn: boolean, calendar:string) => void;
    cancelSaveSettings: () => void;
}

interface SettingsState {
  tmpWarnEmpty: boolean;
}

const calendarOptions = {
  "leave (Leave Untouched)": "leave",
  "replace (Replace with Gregorian)": "replace",
  "add (Add Gregorian)": "add"
};

@observer
class Settings extends Component<SettingsProperties, SettingsState> {
  private tempSparqlEndpointRef: React.RefObject<HTMLInputElement>;
  private tempCalendarRef: React.RefObject<HTMLInputElement>;

  constructor(props: SettingsProperties) {
    super(props);
    this.tempSparqlEndpointRef = React.createRef();
    this.tempCalendarRef = React.createRef();

    this.state = {
      tmpWarnEmpty: this.props.warnEmpty,
    }
  }

  handleSaveSettings() {
    const endpoint = (this.tempSparqlEndpointRef as any).current.value;
    const warn = this.state.tmpWarnEmpty;
    const calendar = (calendarOptions as any)[(this.tempCalendarRef as any).current.value];
    this.props.handleSaveSettings(endpoint, warn, calendar);
  }


  render() {
    const sparqlEndpoints = [
      Config.defaultSparqlEndpoint,
      "https://query.wikidata.org/sparql"
    ];
    Object.keys(calendarOptions).map((choice) => (
      <Dropdown.Item key="choice.name" onClick={() => (this.tempCalendarRef as any).current.value = choice}>{choice}</Dropdown.Item>
    ));
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
                    defaultValue={this.props.endpoint}
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
              </Form.Group>


              <Form.Group as={Row} style={{ marginTop: "1rem" }}>

              <Form.Label column sm="12" md="3" className="text-right">
                Warn for empty cells
              </Form.Label>
              <Col sm="12" md="9">

                <input type="checkbox" 
                  style={{ width: '25px', height: '25px', marginTop: '5px' }}
                  defaultChecked={(this.props.warnEmpty)}
                  onChange={(event) => this.setState({ tmpWarnEmpty: event?.target.checked })}/>
              </Col>
            </Form.Group>
            <Form.Group as={Row} style={{ marginTop: "1rem" }}>
              <Form.Label column sm="12" md="3" className="text-right">
              Non-Gregorian Calendar
              </Form.Label>
              <Col sm="12" md="9">
                <Dropdown as={InputGroup} alignRight>
                  <Form.Control
                    type="text"
                    defaultValue={Object.keys(calendarOptions).find(key => (calendarOptions as any)[key] === this.props.calendar)}
                    ref={this.tempCalendarRef}
                    onKeyDown={(event: any) => event.stopPropagation()} // or Dropdown would get error
                  />
                  <Dropdown.Toggle split variant="outline-dark" id="calendar"/>
                  <Dropdown.Menu style={{ width: "100%" }}>
                    {calendarOptions}
                  </Dropdown.Menu>
                </Dropdown>
              </Col>
            </Form.Group>

            {/* datamart integration on/off */}
            <Form.Group as={Row} style={{ marginTop: "1rem" }}>
              <Form.Label column sm="12" md="3" className="text-right">
              Turn Datamart Integration ON
              </Form.Label>
              <Col sm="12" md="9">
                <input type="checkbox"
                  style={{ width: '25px', height: '25px', marginTop: '5px' }}
                  defaultChecked={false} />
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
                  placeholder="Datamart api url" />
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
