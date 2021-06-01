import React, { Component } from 'react';
import { observer } from "mobx-react"
// import './project.css';
import Draggable from 'react-draggable';
import { Button, Form, Toast } from 'react-bootstrap';
import './entity-menu.css'
import * as utils from './table-utils';
import { CellSelection } from '@/renderer/common/general';
import EntityForm from './entity-form';
import { EntityFields } from '@/renderer/common/dtos';

interface EntityMenuState {
    entityFields: EntityFields
}

@observer
class EntityMenu extends Component<{ onClose: (entityFields?: EntityFields) => void, selection: CellSelection, title?:string }, EntityMenuState> {


    constructor(props: any) {
        super(props);
        this.state = {
            entityFields: {
                isProperty: true,
                label: "",
                description: "",
                dataType: "string"
            }
        }
    }

    handleOnChange(event: KeyboardEvent, key: "label" | "description" | "dataType" | "isProperty") {
        if (event.code === 'Enter') {
            event.preventDefault();
            this.handleOnSubmit();
        }
        const value = (event.target as HTMLInputElement).value;
        console.log("value:", value)
        const updatedEntityFields = { ...this.state.entityFields };
        switch (key) {
            case "isProperty": {
                updatedEntityFields.isProperty = !updatedEntityFields.isProperty
                break;
            }
            case "description": {
                updatedEntityFields.description = value;
                break;
            }
            case "dataType": {
                updatedEntityFields.dataType = value;
                break;
            }
            case "label": {
                updatedEntityFields.label = value;
                break;
            }
            default: {
                break;
            }
        }
        console.log("Entity menu handleOnChange:", updatedEntityFields)
        this.setState({ entityFields: updatedEntityFields });
    }


    handleOnSubmit() {
        const { entityFields } = this.state;
        console.log(this.state);
        this.props.onClose(entityFields);
    }

    render() {
        const { entityFields } = this.state;
        const { onClose, selection, title } = this.props;
        const position = { x: window.innerWidth * 0.10, y: 0 };
        return (
            <Draggable handle=".handle"
                defaultPosition={position}>
                <div className="entity-menu">
                    <Toast onClose={onClose}>
                        <Toast.Header className="handle">
                            {utils.humanReadableSelection(selection)}  {title}
                        </Toast.Header>

                        <Toast.Body>
                            {/* <Form className="container"> */}
                                <EntityForm
                                    entityFields={entityFields}
                                    handleOnChange={(event: KeyboardEvent, key: "label" | "description" | "dataType" | "isProperty") => this.handleOnChange(event, key)}
                                />
                            {/* </Form> */}
                            <Button variant="primary" type="button" onClick={() => this.handleOnSubmit()}
                                disabled={!utils.isValidLabel(entityFields.label)}>
                                Save
                            </Button>
                        </Toast.Body>
                    </Toast>
                </div>
            </Draggable>
        );
    }
}

export default EntityMenu;