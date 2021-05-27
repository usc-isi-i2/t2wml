import React, { Component } from 'react';
import { observer } from "mobx-react"
// import './project.css';
import Draggable from 'react-draggable';
import { Button, Col, Form, Row, Toast } from 'react-bootstrap';
import './entity-menu.css'
import * as utils from './table-utils';
import { CellSelection } from '@/renderer/common/general';

interface EntityMenuState {
    isProperty: boolean;
    label: string;
    description: string;
    dataType: string;
}

@observer
class EntityMenu extends Component<{ onClose: () => void, selection: CellSelection }, EntityMenuState> {

    constructor(props: any) {
        super(props);
        this.state = {
            isProperty: true,
            label: "",
            description: "",
            dataType: "string"
        }
    }

    updateLabelFieldWithErrorCheck(value: string) {
        console.log(value);
    }

    handleOnChange(event: KeyboardEvent, key: "label" | "description" | "data_type" | "is_property") {
        if (event.code === 'Enter') {
            event.preventDefault();
            this.handleOnSubmit();
        }
        const value = (event.target as HTMLInputElement).value;

        if (key=="is_property"){
            const { isProperty } = this.state;
            this.setState({ isProperty: !isProperty });
        }
        
        console.log(key, value)
        // const updatedFields = { ...this.state.fields }
        // updatedFields[key as keyof AnnotationFields] = value;
        // this.changed = true;

        // this.setState({ fields: updatedFields }, () => {
        //   if (this.timeoutId) {
        //     window.clearTimeout(this.timeoutId);
        //   }
        //   this.timeoutId = window.setTimeout(() => {
        //     let { type } = this.state.fields;
        //     if (key === 'unit' || key === 'property') {
        //       this.setState({ showResult1: true, showResult2: false })
        //     }
        //     if (!type) { type = "string"; }
        //     this.handleOnPropertyUnit(key, value, type);
        //   }, 300);
        // });
    }

    handleOnSubmit() {
        console.log(this.state);
        this.props.onClose();
    }

    render() {
        const { isProperty, label, description, dataType } = this.state;
        const { onClose, selection } = this.props;
        const position = { x: window.innerWidth * 0.10, y: 0 };
        return (
            <Draggable handle=".handle"
                defaultPosition={position}>
                <div className="entity-menu">
                    <Toast onClose={onClose}>
                        <Toast.Header className="handle">
                            {utils.humanReadableSelection(selection)}
                        </Toast.Header>

                        <Toast.Body>
                            <Form className="container">
                                <Form.Group as={Row} style={{ marginTop: "1rem" }}
                                    onChange={(event: KeyboardEvent)  => this.setState({ label: (event.target as HTMLInputElement).value })}>
                                    <Form.Label column sm="12" md="3" className="text-muted">Label</Form.Label>
                                    <Col sm="12" md='9'>
                                        <Form.Control value={label} required isInvalid={!label || label.length==0}/>
                                        <Form.Control.Feedback type="invalid">
                                        Label cannot be empty
                                        </Form.Control.Feedback>
                                    </Col>
                                </Form.Group>

                                <Form.Group as={Row} style={{ marginTop: "1rem" }}
                                    onChange={(event: KeyboardEvent)  => this.setState({ description: (event.target as HTMLInputElement).value })}>
                                    <Form.Label column sm="12" md="3" className="text-muted">Description</Form.Label>
                                    <Col sm="12" md='9'>
                                        <Form.Control value={description} />
                                    </Col>
                                </Form.Group>
                                <Form.Group as={Row} style={{ marginTop: "1rem" }}
                                    onChange={() => this.setState({ isProperty: !isProperty })}>
                                    <Form.Check type="checkbox" label="Is property?" />
                                </Form.Group>
                                {isProperty ?
                                    <Form.Group as={Row} style={{ marginTop: "1rem" }}
                                    onChange={(event: KeyboardEvent)  => this.setState({ dataType: (event.target as HTMLInputElement).value })}>
                                        <Form.Label column sm="12" md="3" className="text-muted">Data type</Form.Label>
                                        <Col sm="12" md='9'>
                                            <Form.Control as="select"
                                                value={dataType}>
                                                <option value="quantity">Quantity</option>
                                                <option value="time">Time</option>
                                                <option value="monolingualtext">Monolingual text</option>
                                                <option value="string">String</option>
                                                <option value="wikibaseitem">Wiki base item</option>
                                            </Form.Control>
                                        </Col>
                                    </Form.Group>
                                    : null
                                }
                                <Button variant="primary" type="button" onClick={() => this.handleOnSubmit()}>
                                    Submit
                                </Button>
                            </Form>
                        </Toast.Body>
                    </Toast>
                </div>
            </Draggable>
        );
    }
}

export default EntityMenu;