import React, { Component } from 'react';
import '../project.css';
import '../ag-grid.css';
import '../ag-theme-balham.css';

// App
import { Button, Col, Form, Modal, Row } from 'react-bootstrap';

import { observer } from "mobx-react";
import wikiStore from '@/renderer/data/store';
import EntitiesList from './entities-list';
import EntityFields from './entity-fields';
import Tags from './tags';
import { Entity } from '@/renderer/common/dtos';

interface EntitiesProperties {
    showEntities: boolean;
    properties: any; //type

    handleSaveEntities: (file: string, property: string, propertyVals: any) => void;
    cancelSaveEntities: () => void;
}


interface EntitiesState {
    selectedProperty: string | undefined;
    entityFile: string;
    propertyData?: Entity;
}




@observer
class EntitiesWindow extends Component<EntitiesProperties, EntitiesState> {
    formArgs: any;

    constructor(props: EntitiesProperties) {
        super(props);
        this.formArgs = {};

        this.state = {
            selectedProperty: undefined,
            entityFile: '',
            propertyData: undefined,
        }
    }

    getPropertyData(file: string, property: string) {
        this.setState({
            entityFile: file,
            selectedProperty: property,
        });

        const propertyData = wikiStore.entitiesData.entities[file][property];
        this.formArgs = propertyData;

        this.setState({
            propertyData
        });
    }


    updateFormArgs(key: string, value: string) {
        this.formArgs[key] = value;
    }

    updateTags(tags: string[]) {
        this.formArgs["tags"] = tags;
        this.setState({
            propertyData: this.formArgs
        })
    }

    updateTag (index:number, value:string){
        this.formArgs["tags"][index] = value;

    }


    handleSaveEntities() {
        debugger
        const file = this.state.entityFile;
        const property = this.state.selectedProperty!;
        const propertyVals = this.formArgs;
        let tags = this.formArgs["tags"] as string[];
        if (tags) {
            tags = tags.filter(tag => tag.length > 0);
            this.formArgs["tags"] = tags;
        }
        this.props.handleSaveEntities(file, property, propertyVals);
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

                        <Form.Group as={Row} style={{ marginTop: "1rem" }}>
                            <Col sm="12" md="4">
                                <EntitiesList
                                    selectedProperty={this.state.selectedProperty}
                                    handleSelectEntity={(f: string, prop: string) => this.getPropertyData(f, prop)}
                                />
                            </Col>
                            <Col sm="12" md="8">
                                <Row>
                                    {!this.state.selectedProperty ?
                                        <Form.Label>Select a property to see its details</Form.Label> :
                                        <EntityFields
                                            property={this.state.selectedProperty}
                                            propertyData={this.state.propertyData}
                                            updateField={(key: string, value: string) => this.updateFormArgs(key, value)}
                                        />
                                    }
                                </Row>
                                <Row>
                                    {!this.state.selectedProperty ? null :
                                        <Tags
                                            property={this.state.selectedProperty}
                                            propertyData={this.state.propertyData}
                                            updateTags={(tags) => this.updateTags(tags)}
                                            updateTag={(index, value) => this.updateTag(index, value)}
                                        />}
                                </Row>
                            </Col>
                        </Form.Group>

                    </Form>

                </Modal.Body>

                {/* footer */}
                <Modal.Footer style={{ background: "whitesmoke" }}>
                    <Button variant="outline-dark" onClick={() => this.props.cancelSaveEntities()}>
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

export default EntitiesWindow;
