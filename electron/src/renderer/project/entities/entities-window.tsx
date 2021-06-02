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
import { WikiNode } from '@/renderer/common/dtos';

interface EntitiesProperties {
    showEntities: boolean;
    properties: any; //type

    handleSaveEntities: (file: string, property: string, propertyVals: any) => void;
    cancelSaveEntities: () => void;
}


interface EntitiesState {
    selectedProperty: string | undefined;
    entityFile: string;
    propertyData?: WikiNode;
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

    setErrorToTrue(){
        this.setState({hasError: true})
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


    updatePropertyData(key: "label"|"description"|"data_type", value: string, hasError:boolean) {
        const propertyData={...this.state.propertyData!};
        propertyData[key]=value;
        this.setState({propertyData, hasError, labelContent: ""})
    }

    updateTags(tags: string[]) {
        const propertyData={...this.state.propertyData!};
        propertyData["tags"]=tags;
        this.setState({propertyData, labelContent: ""})
    }

    updateTag (index:number, value:string, hasError:boolean){
        const propertyData={...this.state.propertyData!};
        if (propertyData["tags"]==undefined || propertyData["tags"][index]==undefined){
            console.log("editing tag that doesn't exist");
            return;
        }
        propertyData["tags"][index] = value;
        this.setState({propertyData, hasError, labelContent: ""});
    }

    handleSaveEntities() {
        if (!this.state.propertyData){
            return;
        }
        const file = this.state.entityFile;
        const property = this.state.selectedProperty!;
        const propertyVals = {...this.state.propertyData};
        let tags = propertyVals["tags"];
        if (tags) {
            tags = tags.filter(tag => tag.length > 0);
            propertyVals["tags"] = tags;
        }
        this.props.handleSaveEntities(file, property, propertyVals);

        this.setState({
                labelContent: "Entity fields have been updated. Refresh the project to see changes."
            })

    }

    handleClose(){
        //reset window when closing:
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
        const handleClose= ()=>this.handleClose()
        const enabled = !this.state.hasError && this.state.selectedProperty!=undefined;

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
                                            updateField={(key, value, hasError) => this.updatePropertyData(key, value, hasError)}
                                        />
                                    }
                                </Row>
                                <Row>
                                    {!this.state.selectedProperty ? null :
                                        <Tags
                                            property={this.state.selectedProperty}
                                            propertyData={this.state.propertyData}
                                            updateTags={(tags) => this.updateTags(tags)}
                                            updateTag={(index, value, hasError) => this.updateTag(index, value, hasError)}
                                        />}
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
