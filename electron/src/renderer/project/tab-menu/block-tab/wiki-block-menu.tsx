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

// interface WikiBlockMenuState {
// }

interface WikiBlockMenuProps {
    onClose: (notSubmit?: boolean) => void,
    onGetError: (error:ErrorMessage) => void,
    selection: CellSelection,
    role?: string,
    type?: string
}

@observer
class WikiBlockMenu extends Component<WikiBlockMenuProps, {}> {

    private requestService: RequestService;

    constructor(props: any) {
        super(props);

        this.requestService = new RequestService();
        this.state = {}
    }


    renderWikifyAutoQnodeButton() {
        const { selection, role, type } = this.props;

        const selectedBlock = utils.checkSelectedAnnotationBlocks(selection);

        let buttonWikify = null;
        let buttonAutoQnode = null;
        let dropdownTypes = null;
        let buttonRemoveWiki = null;
        if (selection && (role === 'unit' || role === 'mainSubject' || type === 'wikibaseitem')) {
            buttonWikify = (
                <Col>
                    <Button
                        size="sm"
                        type="button"
                        variant="outline-dark"
                        style={{ marginTop: "1rem" }}
                        onClick={() => this.handleOnWikify()}>
                        Send this block for wikification
                    </Button>
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
                    <Button
                        size="sm"
                        type="button"
                        variant="link"
                        style={{ color: "red" }}
                        onClick={(event: React.MouseEvent) => this.handleOnRemoveWikification(event)}>
                        remove wikification
                    </Button>
                );
            }

        }
        if (selection && role == "property") {
            dropdownTypes = (
                <Col>
                    <Form.Label className="text-muted">Type</Form.Label>
                    <Form.Control as="select" value={type} key={type}
                        // onChange={(event: any) => this.handleOnChange(event, 'type')}
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
        if (! (buttonWikify || buttonAutoQnode || dropdownTypes || buttonRemoveWiki)){
            const notSubmit = false;
            this.props.onClose(notSubmit)
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

    async handleOnWikify() {
        const data = { "selection": this.props.selection };
        wikiStore.table.showSpinner = true;
        try {
            await this.requestService.callWikifierService(data);
        }
        finally {
            wikiStore.table.showSpinner = false;
        }
    }

    async handleOnAutoCreateMissingQnode() {
        const { selection, role, type } = this.props;
        const data = {
            "selection": selection,
            "is_property": role == "property",
            "data_type": role == "property" ? (type ? type : "string") : undefined
        };
        wikiStore.table.showSpinner = true;
        try {
            await this.requestService.callAutoCreateWikinodes(data);
        }
        finally {
            wikiStore.table.showSpinner = false;
        }
    }

    async handleOnRemoveWikification(event: React.MouseEvent) {
        event.preventDefault();
    
        const { selection: selectionProps } = this.props
        const selectedBlock = utils.checkSelectedAnnotationBlocks(selectionProps);
        console.log(selectedBlock)
        if (!selectedBlock) { return; }
    
        wikiStore.table.showSpinner = true;
        wikiStore.wikifier.showSpinner = true;
        wikiStore.yaml.showSpinner = true;
    
        const selection = [
          [selectedBlock.selection.x1 - 1, selectedBlock.selection.y1 - 1],
          [selectedBlock.selection.x2 - 1, selectedBlock.selection.y2 - 1],
        ];
    
        try {
          this.requestService.removeQNodes({selection});
        } catch (error) {
          error.errorDescription += `Wasn't able to submit the qnode!\n` + error.errorDescription;
          console.log(error.errorDescription)
          this.props.onGetError(error);
        } finally {
          wikiStore.table.showSpinner = false;
          wikiStore.wikifier.showSpinner = false;
          wikiStore.yaml.showSpinner = false;
        }
      }

    render() {
        const { onClose, selection } = this.props;
        const position = { x: window.innerWidth * 0.10, y: 0 };
        return (
            <Draggable handle=".handle"
                defaultPosition={position}>
                <div className="wiki-block-menu">
                    <Toast onClose={onClose}>
                        <Toast.Header className="handle">
                            {utils.humanReadableSelection(selection)}
                        </Toast.Header>

                        <Toast.Body>
                            {this.renderWikifyAutoQnodeButton()}
                        </Toast.Body>
                    </Toast>
                </div>
            </Draggable>
        );
    }
}

export default WikiBlockMenu;
