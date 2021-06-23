import React, { Component } from 'react';
import { observer } from "mobx-react"
import Draggable from 'react-draggable';
import { Button, Col, Form, Toast } from 'react-bootstrap';
import './entity-menu.css'

import { CellSelection, ErrorMessage } from '@/renderer/common/general';
import EntityForm from './entity-form';
import { EntityFields, QNode } from '@/renderer/common/dtos';
import { humanReadableSelection, isValidLabel } from '../table/table-utils';
import SearchResults from './block-tab/search-results';
import RequestService, { IStateWithError } from '@/renderer/common/service';
import ToastMessage from '@/renderer/common/toast';

interface EntityMenuState extends IStateWithError {
    entityFields: EntityFields,
    searchText?: string,
}

interface EntityMenuProps {
    onClose: (entityFields?: EntityFields) => void,
    selection: CellSelection,
    title?: string,
    data_type?: string,
    // showResults: boolean,
    onSelectNode: (key: string, value?: QNode | undefined) => void,
}

@observer
class EntityMenu extends Component<EntityMenuProps, EntityMenuState> {

    private requestService: RequestService;
    private timeoutSearch?: number;


    constructor(props: any) {
        super(props);

        this.requestService = new RequestService();

        const { title, data_type } = this.props;
        const is_property = title?.toLowerCase() === "property";
        this.state = {
            errorMessage: {} as ErrorMessage,
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


    async handleOnSearch(key: string, value: string, type: string) {

        if (key === 'property') {
            try {
                await this.requestService.call(this, () => (
                    this.requestService.getProperties(value, type)
                ));
            } catch (error) {
                error.errorDescription += `\nWasn't able to find any properties for ${value}`;
                this.setState({ errorMessage: error });
            } finally {
                console.log('properties request finished');
            }
        }

        if (key === 'unit') {

            const instanceOf: QNode = {
                label: 'unit of measurement',
                description: 'quantity, defined and adopted by convention',
                id: 'Q47574',
            }

            try {
                await this.requestService.call(this, () => (
                    this.requestService.getQNodes(value, false, instanceOf)
                ));
            } catch (error) {
                error.errorDescription += `\nWasn't able to find any qnodes for ${value}`;
                this.setState({ errorMessage: error });
            } finally {
                console.log('qnodes request finished');
            }
        }
    }

    handleOnChangeSearchText(event: any, key?: string): void {
        if (!key) {return;}
        const value = (event.target as HTMLInputElement).value;

        this.setState({ searchText: !value || value.trim().length === 0 ? undefined : value }, () => {
            if (this.timeoutSearch) {
                window.clearTimeout(this.timeoutSearch);
            }
            this.timeoutSearch = window.setTimeout(() => {
                let { data_type } = this.state.entityFields;
                if (!data_type) { data_type = "string"; }

                this.handleOnSearch(key, value.trim(), data_type);
            }, 300);
        });
    }


    handleOnSubmit() {
        const { entityFields } = this.state;
        console.log(this.state);
        this.props.onClose(entityFields);
    }

    renderSearchResults() {
        // const { showResults } = this.props
        return (
            <div>
                {/* {
                    showResults ? */}
                <SearchResults onSelect={(key: string, value: QNode) => this.props.onSelectNode(key, value)} />
                {/* : null
                } */}
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
                    {this.state.errorMessage.errorDescription ? <ToastMessage message={this.state.errorMessage} /> : null}
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


}


export default EntityMenu;
