import React, { Component } from 'react';
import { observer } from "mobx-react"
// import './project.css';
import Draggable from 'react-draggable';
import { Button, Toast } from 'react-bootstrap';
import './entity-menu.css'

import { CellSelection } from '@/renderer/common/general';
import EntityForm from './entity-form';
import { EntityFields } from '@/renderer/common/dtos';
import { humanReadableSelection, isValidLabel } from '../table/table-utils';

interface EntityMenuState {
    entityFields: EntityFields
}

@observer
class EntityMenu extends Component<{
    onClose: (entityFields?: EntityFields) => void,
    selection: CellSelection,
    title?: string,
    data_type?: string
}, EntityMenuState> {


    constructor(props: any) {
        super(props);
        const { title, data_type } = this.props;
        const is_property = title?.toLowerCase() === "property";
        this.state = {
            entityFields: {
                is_property: is_property,
                label: "",
                description: "",
                data_type: data_type ? data_type.toLowerCase().replaceAll(' ', '') : "string"
            }
        }
    }

    handleOnChange(event: KeyboardEvent, key: "label" | "description" | "data_type" | "is_property") {
        if (event.code === 'Enter') {
            event.preventDefault();
            this.handleOnSubmit();
        }
        const value = (event.target as HTMLInputElement).value;
        const updatedEntityFields = { ...this.state.entityFields };
        switch (key) {
            case "is_property": {
                updatedEntityFields.is_property = !updatedEntityFields.is_property
                break;
            }
            default: {
                (updatedEntityFields as any)[key] = value;
                break;
            }
        }
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
                            {humanReadableSelection(selection)}  {title}
                        </Toast.Header>

                        <Toast.Body>
                            <EntityForm
                                entityFields={entityFields}
                                handleOnChange={(event: KeyboardEvent, key: "label" | "description" | "data_type" | "is_property") => this.handleOnChange(event, key)}
                            />
                            <Button variant="primary" type="button" onClick={() => this.handleOnSubmit()}
                                disabled={!isValidLabel(entityFields.label)}>
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
