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
import { QNode } from '@/renderer/common/dtos';

interface EntitiesProperties {
    showEntities: boolean;
    properties: any; //type

    handleSaveEntities: (file: string, property: string, propertyVals: any) => void;
    cancelSaveEntities: () => void;
}


interface EntitiesState {
    selectedProperty?: string;
    entityFile: string;
    propertyData?: QNode;
    labelContent: string;
    hasError: boolean;
}




@observer
class EntitiesWindow extends Component<EntitiesProperties, EntitiesState> {

    constructor(props: EntitiesProperties) {
        super(props);

        this.state = {
            selectedProperty: undefined,
            entityFile: '',
            propertyData: undefined,
            labelContent: "",
            hasError: false
        }
    }

    setErrorToTrue() {
        this.setState({ hasError: true })
    }

    getPropertyData(file: string, property: string) {
        this.setState({
            entityFile: file,
            selectedProperty: property,
            labelContent: "",
            hasError: false
        });

        const propertyData = wikiStore.entitiesData.entities[file][property];

        this.setState({
            propertyData
        });
    }


    updatePropertyData(key: "label" | "description" | "data_type", value: string, hasError: boolean) {
        const propertyData = { ...this.state.propertyData! };
        propertyData[key] = value;
        this.setState({ propertyData, hasError, labelContent: "" })
    }

    updateTags(tags?: { [key: string]: string }) {
        const { propertyData } = this.state;
        console.log('updateTags', propertyData, tags)
        if (!tags || !propertyData) { return; }
        propertyData["tags"] = tags;
        this.setState({ propertyData, labelContent: "" })
    }

    updateTag(key: string, part: 'key' | 'value', hasError: boolean, newPart: string) {
        const { propertyData } = this.state;
        if (!propertyData || propertyData["tags"] == undefined || propertyData["tags"][key] == undefined) {
            console.log("editing tag that doesn't exist", propertyData);
            return;
        }
        if (part === 'key') {
            propertyData["tags"][newPart] = propertyData["tags"][key].slice() // make a copy- by value
            delete propertyData["tags"][key];
        } else {
            propertyData["tags"][key] = newPart;
        }
        this.setState({ propertyData, hasError, labelContent: "" });
    }

    handleSaveEntities() {
        const { propertyData, entityFile, selectedProperty } = this.state;
        if (!propertyData || !selectedProperty) {
            return;
        }
        this.props.handleSaveEntities(entityFile, selectedProperty, propertyData);

        this.setState({
            labelContent: "Entity fields have been updated. Refresh the project to see changes."
        })

    }

    handleClose() {
        // reset window when closing:
        this.setState({
            selectedProperty: undefined,
            entityFile: '',
            propertyData: undefined,
            labelContent: "",
            hasError: false
        })
        this.props.cancelSaveEntities()
    }


    render() {
        const { selectedProperty, propertyData } = this.state;
        const handleClose = () => this.handleClose()
        const enabled = !this.state.hasError && selectedProperty != undefined;

        return (
            <Modal show={this.props.showEntities} size="lg" onHide={handleClose}>

                {/* header */}
                <Modal.Header closeButton style={{ background: "whitesmoke" }}>
                    <Modal.Title>Entities</Modal.Title>
                </Modal.Header>

                {/* body */}
                <Modal.Body>
                    <Form className="container">

                        <Form.Group as={Row} style={{ marginTop: "1rem" }}>
                            <Col sm="12" md="4">
                                <EntitiesList
                                    selectedProperty={selectedProperty}
                                    handleSelectEntity={(f: string, prop: string) => this.getPropertyData(f, prop)}
                                />
                            </Col>
                            <Col sm="12" md="8">
                                <Row>
                                    {!selectedProperty ?
                                        <Form.Label>Select a property to see its details</Form.Label> :
                                        <EntityFields
                                            property={selectedProperty}
                                            propertyData={propertyData}
                                            updateField={(key, value, hasError) => this.updatePropertyData(key, value, hasError)}
                                        />
                                    }
                                </Row>
                                <Row>
                                    {selectedProperty && propertyData ?
                                        <Tags
                                            property={selectedProperty}
                                            propertyData={propertyData}
                                            updateTags={(tags) => this.updateTags(tags)}
                                            updateTag={(key: string, part: 'key' | 'value', hasError: boolean, newPart: string) => this.updateTag(key, part, hasError, newPart)}
                                        />
                                        :
                                        null
                                    }
                                </Row>
                            </Col>
                        </Form.Group>

                    </Form>

                </Modal.Body>

                {/* footer */}
                <Modal.Footer style={{ background: "whitesmoke" }}>
                    <Form.Label>{this.state.labelContent}</Form.Label>
                    <Button variant="outline-dark" onClick={handleClose}>
                        Close
                    </Button>
                    <Button variant="dark" disabled={!enabled} onClick={() => this.handleSaveEntities()}>
                        Save
                    </Button>
                </Modal.Footer>

            </Modal>
        );
    }
}

export default EntitiesWindow;
