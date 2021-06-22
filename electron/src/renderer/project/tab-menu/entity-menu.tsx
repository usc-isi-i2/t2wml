import React, { Component } from 'react';
import { observer } from "mobx-react"
import Draggable from 'react-draggable';
import { Button, Col, Form, Toast } from 'react-bootstrap';
import './entity-menu.css'

import { CellSelection } from '@/renderer/common/general';
import EntityForm from './entity-form';
import { AnnotationFields, EntityFields, QNode } from '@/renderer/common/dtos';
import { humanReadableSelection, isValidLabel } from '../table/table-utils';
import SearchResults from './block-tab/search-results';

interface EntityMenuState {
    entityFields: EntityFields,
    searchText?: string,
}

@observer
class EntityMenu extends Component<{
    onClose: (entityFields?: EntityFields) => void,
    selection: CellSelection,
    title?: string,
    data_type?: string,
    showResult1: boolean,
    onSelectNode: (key: string, value?: QNode | undefined) => void,
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
            },
            searchText: ""
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

    renderSearchResults() {
        const { showResult1 } = this.props
        return (
            <div>
                {
                    showResult1 ?
                        <SearchResults onSelect={(key: string, value: QNode) => this.props.onSelectNode(key, value)} />
                        : null
                }
            </div>
        )
    }

    render() {
        const { entityFields, searchText } = this.state;
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
                            <Col>
                                <Form.Label>
                                    Create Entity:
                                </Form.Label>
                                <EntityForm
                                    entityFields={entityFields}
                                    handleOnChange={(event: KeyboardEvent, key: "label" | "description" | "data_type" | "is_property") => this.handleOnChange(event, key)}
                                    disableDataType={true}
                                />
                            </Col>
                            <Col >
                            <Form.Group
                                onChange={(event: any) => this.handleOnChangeSearchText(event, title?.toLowerCase())}>
                                <Form.Label>
                                    Search for existing node:
                                </Form.Label>
                                <Form.Control
                                    type="text" size="sm"
                                    value={searchText}
                                />
                            </Form.Group>
                            </Col>
                            <Col sm="12" md="12">
                                {this.renderSearchResults()}
                            </Col>

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

    handleOnChangeSearchText(event: any, key?: string): void {
        const value = (event.target as HTMLInputElement).value;
        
        if (!value || value.trim().length === 0) {
            this.setState({searchText: undefined});
        } else {
            this.setState({searchText: value})
        }
    }
}

export default EntityMenu;
