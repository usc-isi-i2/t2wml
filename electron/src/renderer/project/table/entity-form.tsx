import React, { Component } from 'react';
import { observer } from "mobx-react"
import { Form, Row } from 'react-bootstrap';
import './entity-menu.css'
import { isValidLabel } from './table-utils';
import { WikiNode } from '@/renderer/common/dtos';

interface EntityFormProp {
    entityFields: WikiNode;
    handleOnChange: (event: KeyboardEvent, key: "label" | "description" | "data_type" | "is_property") => void;
    isReadOnly?: boolean;
}

@observer
class EntityForm extends Component<EntityFormProp, {}> {

    constructor(props: any) {
        super(props);
    }

    render() {
        const { handleOnChange } = this.props;
        const { is_property, label, description, data_type } = this.props.entityFields;
        const { isReadOnly } = this.props;
        return (
            <Form.Group as={Row}>
                <Form.Group as={Row} style={{ marginTop: "1rem" }}
                    onChange={(event: KeyboardEvent) => handleOnChange(event, "label")}>
                    <Form.Label className="text-muted">Label</Form.Label>
                    <Form.Control value={label} required isInvalid={!isReadOnly && !isValidLabel(label)} disabled={isReadOnly} />
                    <Form.Control.Feedback type="invalid">
                        The label must contain an alphabetic char.
                                        </Form.Control.Feedback>
                </Form.Group>

                <Form.Group as={Row} style={{ marginTop: "1rem" }}
                    onChange={(event: KeyboardEvent) => handleOnChange(event, "description")}>
                    <Form.Label className="text-muted">Description</Form.Label>
                    <Form.Control value={description} disabled={isReadOnly} />
                </Form.Group>

                <Form.Group as={Row} style={{ marginTop: "1rem" }}
                    onChange={(event: KeyboardEvent) => handleOnChange(event, "is_property")}>
                    <Form.Check type="checkbox" label="Is property?" checked={is_property} disabled={isReadOnly} />
                </Form.Group>
                {
                    is_property ?
                        <Form.Group as={Row} style={{ marginTop: "1rem" }}
                            onChange={(event: KeyboardEvent) => handleOnChange(event, "data_type")}>
                            <Form.Label column sm="12" md="12" className="text-muted">Data type</Form.Label>
                            <Form.Control as="select" disabled={isReadOnly}
                                value={data_type}>
                                <option value="quantity">Quantity</option>
                                <option value="time">Time</option>
                                <option value="monolingualtext">Monolingual text</option>
                                <option value="string">String</option>
                                <option value="wikibaseitem">Wikibase item</option>
                            </Form.Control>
                        </Form.Group>
                        : null
                }

            </Form.Group>

        );
    }
}

export default EntityForm;
