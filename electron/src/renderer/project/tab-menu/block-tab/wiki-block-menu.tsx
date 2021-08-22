import React, { Component } from 'react';
import { observer } from "mobx-react"
import Draggable from 'react-draggable';
import { Button, Col, Form, Row, Toast } from 'react-bootstrap';
import './wiki-block-menu.css'
import * as utils from '../../table/table-utils';
import { CellSelection, ErrorMessage } from '@/renderer/common/general';

import RequestService from '@/renderer/common/service';
import wikiStore from '@/renderer/data/store';
import { TYPES } from './annotation-options';



interface WikiBlockMenuProps {
    onClose: () => void,
    onGetError: (error: ErrorMessage) => void,
    selection: CellSelection,
    role?: string,
    type?: string
}

@observer
class WikiBlockMenu extends Component<WikiBlockMenuProps, { overwrite: boolean, dataType: string }> {

    private requestService: RequestService;

    constructor(props: any) {
        super(props);

        this.requestService = new RequestService();
        this.state = {
            overwrite: false,
            dataType: this.props.type ? this.props.type : "string"
        }
    }


    renderWikifyAutoQnodeButton() {
        const { selection, role, type } = this.props;
        const { overwrite, dataType } = this.state;

        const selectedBlock = utils.checkSelectedAnnotationBlocks(selection);

        let buttonWikify = null;
        let buttonAutoQnode = null;
        let dropdownTypes = null;
        let buttonRemoveWiki = null;
        if (selection && (role === 'unit' || role === 'mainSubject' || type === 'wikibaseitem')) {
            buttonWikify = (
                <Col sm="12" md="12">
                    <Form.Group as={Row}>
                        <Button
                            size="sm"
                            type="button"
                            variant="outline-dark"
                            style={{ marginTop: "1rem" }}
                            onClick={() => this.handleOnWikify()}>
                            Send this block for wikification
                        </Button>
                        <Form.Check type="checkbox" style={{ marginTop: "0.5rem" }} inline label="Overwrite existing wikification?" checked={overwrite}
                            onChange={() => this.setState({ overwrite: !overwrite })} />
                    </Form.Group>
                    <hr></hr>
                </Col>)
        }
        if (selection && (role === 'unit' || role === 'mainSubject' || type === 'wikibaseitem' || role == "property")) {
            buttonAutoQnode = (
                <Col>
                    <Button
                        type="button"
                        size="sm"
                        variant="outline-dark"
                        style={{ marginTop: "1rem" }}
                        onClick={() => this.handleOnAutoCreateMissingQnode()}>
                        Auto-create missing nodes
                    </Button>
                </Col>
            );
            if (selectedBlock) {
                buttonRemoveWiki = (
                    <Col>
                    <hr></hr>
                    <Button
                        size="sm"
                        type="button"
                        variant="outline-danger"
                        onClick={(event: React.MouseEvent) => this.handleOnRemoveWikification(event)}>
                        Remove Wikification
                    </Button>
                    </Col>
                );
            }

        }
        if (selection && role == "property") {
            dropdownTypes = (
                <Col>
                    <Form.Label className="text-muted">Type</Form.Label>
                    <Form.Control as="select" value={dataType} key={dataType}
                    onChange={(event: any) => this.handleOnChangeDataType(event)}
                    >
                        {TYPES.map((type, i) => (
                            <option key={i}
                                value={type.value}>
                                {type.label}
                            </option>
                        ))}
                    </Form.Control>
                </Col>
            )
        }
        if (!(buttonWikify || buttonAutoQnode || dropdownTypes || buttonRemoveWiki)) {
            this.props.onClose();
        }
        const buttons = (
            <Col sm="12" md="12">
                <Row>
                    {buttonWikify}
                    {buttonAutoQnode}
                    {dropdownTypes}
                </Row>
                <Row>
                    {buttonRemoveWiki}
                </Row>
            </Col>);
        return buttons;
    }

    handleOnChangeDataType(event: any): void {
        this.setState({dataType: event.target.value})
    }

    async handleOnWikify() {
        const data = {
            "selection": this.props.selection,
            "overwrite": this.state.overwrite
        };
        wikiStore.table.showSpinner = true;
        try {
            await this.requestService.callWikifierService(data);
        }
        catch(error){
                error.errorTitle = "Wasn't able to use wikifier service";
                console.log(error.errorDescription);
                this.props.onGetError(error);
        }
        finally {
            wikiStore.table.showSpinner = false;
            this.props.onClose()
        }
    }

    async handleOnAutoCreateMissingQnode() {
        const { selection, role } = this.props;
        const { dataType } = this.state;
        const data = {
            "selection": selection,
            "is_property": role == "property",
            "data_type": role == "property" ? (dataType ? dataType : "string") : undefined
        };
        wikiStore.table.showSpinner = true;
        try {
            await this.requestService.callAutoCreateWikinodes(data);
        }
        finally {
            wikiStore.table.showSpinner = false;
            this.props.onClose()
        }
    }

    async handleOnRemoveWikification(event: React.MouseEvent) {
        event.preventDefault();

        const { selection: selectionProps } = this.props
        const selectedBlock = utils.checkSelectedAnnotationBlocks(selectionProps);
        console.log(selectedBlock)
        if (!selectedBlock) { return; }

        wikiStore.table.showSpinner = true;
        wikiStore.partialCsv.showSpinner = true;
        wikiStore.yaml.showSpinner = true;

        const selection = [
            [selectedBlock.selection.x1 - 1, selectedBlock.selection.y1 - 1],
            [selectedBlock.selection.x2 - 1, selectedBlock.selection.y2 - 1],
        ];

        try {
            this.requestService.removeQNodes({ selection });
        } catch (error) {
            error.errorTitle = "Wasn't able to submit the qnode";
            console.log(error.errorDescription);
            this.props.onGetError(error);
        } finally {
            wikiStore.table.showSpinner = false;
            wikiStore.partialCsv.showSpinner = false;
            wikiStore.yaml.showSpinner = false;
        }
    }

    render() {
        const { onClose, selection } = this.props;
        const position = { x: 20, y: 0 }; //window.innerWidth * 0.05
        return (
            <Draggable handle=".handle"
                defaultPosition={position}>
                <div className="wiki-block-menu">
                    <Toast onClose={onClose}>
                        <Toast.Header className="handle">
                            <strong className="mr-auto">{utils.humanReadableSelection(selection)}</strong>
                        </Toast.Header>

                        <Toast.Body>
                            {this.renderWikifyAutoQnodeButton()}

                            {/* <Button
                                size="sm"
                                type="button"
                                variant="outline-dark"
                                onClick={() => onClose()}
                                style={{ marginTop: "1rem", marginRight: "0rem" }}>
                                OK
                            </Button> */}


                        </Toast.Body>
                    </Toast>
                </div>
            </Draggable>
        );
    }
}

export default WikiBlockMenu;
