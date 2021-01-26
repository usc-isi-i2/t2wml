import React, { Component } from 'react';
import '../project.css';
import '../ag-grid.css';
import '../ag-theme-balham.css';

// App
import { Button, Col, Form, Modal, Row } from 'react-bootstrap';

import { observer } from "mobx-react";
import wikiStore from '@/renderer/data/store';


interface EntitiesProperties {
    showEntities: boolean;
    properties: any; //type

    handleSaveEntities: (file: string, property: string, propertyVals: any) => void;
    cancelSaveEntities: () => void;
}

interface EntitiesState {

  selectedProperty: string | undefined;
  entityFile: string;
  propertyData: any;
  data: any;
}


@observer
class Entities extends Component<EntitiesProperties, EntitiesState> {
  constructor(props: EntitiesProperties) {
    super(props);

    this.state = {
      selectedProperty: undefined,
      entityFile: '',
      // property: '',
      propertyData: {},
      data: [],
    }
  }

  getPropertyData(file: string, property: string) {
    this.setState({
      entityFile: file,
      selectedProperty: property,
    });
    const propertyData = wikiStore.entitiesData.entities[file][property];
    this.setState({
      propertyData
    });

    this.setState({ data: [] });
    const data = [
            <li>
            <Form.Group>
              <Form.Label>Label</Form.Label><br></br>
              <Form.Control defaultValue={propertyData.label} />
            </Form.Group>
          </li>,
            <li>
            <Form.Group>
              <Form.Label>Description</Form.Label><br></br>
              <Form.Control defaultValue={propertyData.description} />
            </Form.Group>
          </li>
    ];
    if (propertyData.data_type){
      data.push(
        <li>
        <Form.Group>
          <Form.Label>Data type</Form.Label><br></br>
          <Form.Control defaultValue={propertyData.data_type} />
        </Form.Group>
      </li>
      )
    }

    if (propertyData.tags){
      let index=1;
      for (const tag in propertyData.tags){
        data.push(
          <li>
          <Form.Group>
            <Form.Label>Tag {index}</Form.Label><br></br>
            <Form.Control defaultValue={tag} />
          </Form.Group>
        </li>)
        index=index+1;
      }
    }

    this.setState({data});
  }

  handleSaveEntities() {
    const file = this.state.entityFile;
    const property = this.state.selectedProperty!;
    const propertyVals = this.state.propertyData
    this.props.handleSaveEntities(file, property, propertyVals);
  }


  render() {
    const properties = [];
    for (const f in wikiStore.entitiesData.entities) {
      for (const prop in wikiStore.entitiesData.entities[f]) {
        // TODO: add key index
        if (prop === this.state.selectedProperty) {
          properties.push(
            <li onClick={() => this.getPropertyData(f, prop)}><b>{prop}</b></li>
          );} else {
          properties.push(
            <li onClick={() => this.getPropertyData(f, prop)}>{prop}</li>
          );}
      }
    }

    return (
      <Modal show={this.props.showEntities} size="lg" onHide={() => { /* do nothing */ }}>

        {/* header */}
        <Modal.Header style={{ background: "whitesmoke" }}>
          <Modal.Title>Entities</Modal.Title>
        </Modal.Header>

        {/* body */}
        <Modal.Body>
          <Form className="container">

            <Form.Group as={Row} style={{ marginTop: "1rem" }}>
              <Col sm="12" md="4">
                <ul>
                  {properties}
                </ul>
              </Col>
              <Col sm="12" md="8">
              {!this.state.selectedProperty ?
                      <Form.Label>
                        Select a property to see its details
                      </Form.Label> :
                <ul>
                  {this.state.data}
                </ul>}
              </Col>
            </Form.Group>

          </Form>

        </Modal.Body>

        {/* footer */}
        <Modal.Footer style={{ background: "whitesmoke" }}>
          <Button variant="outline-dark" onClick={() => this.props.cancelSaveEntities() }>
            Cancel
          </Button>
          <Button variant="dark" onClick={() => this.handleSaveEntities()}>
            Save
          </Button>
        </Modal.Footer>

      </Modal>
    );
  }
}

export default Entities;
