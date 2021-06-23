import React, { Component } from 'react';
import { observer } from "mobx-react"
import { Form, Row, Col, Button } from 'react-bootstrap';
import { columnToLetter, isValidLabel } from '../../table/table-utils';
import wikiStore from '@/renderer/data/store';
import { AnnotationBlock, AnnotationFields, nameQNodeFields } from '@/renderer/common/dtos';
import { faTimesCircle } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

interface NodeFieldProps {
    selectedBlock?: AnnotationBlock;
    fields: AnnotationFields;
    searchFields: {
        property?: string;
        unit?: string;
        subject?: string;
    };
    type: any;
    onChangeFields: (fields:AnnotationFields) => void;
    changeShowEntityMenu: (newTypeEntityMenu: string) => void;
}


@observer
class NodeField extends Component<NodeFieldProps, {}> {


    constructor(props: NodeFieldProps) {
        super(props);
    }

    render() {
        const { selectedBlock, fields, searchFields, type } = this.props;
        const key: string = type.label.toLowerCase();

        const linkedBlockId = key === "property" ? selectedBlock?.links?.property : (key === "unit" ? selectedBlock?.links?.unit : undefined);
        let linkedBlockSelection = "";
        if (linkedBlockId) {
            for (const block of wikiStore.annotations.blocks) {
                if (block.id == linkedBlockId) {
                    const { x1, x2, y1, y2 } = block.selection;
                    linkedBlockSelection = `${columnToLetter(x1)}${y1}` + ":" + `${columnToLetter(x2)}${y2}`
                }
            }
        }

        const selectedValue = (fields && fields[type.value as nameQNodeFields]) ? fields[(type.value as nameQNodeFields)] : undefined;
        let url = "";
        if (selectedValue?.id) { url = isValidLabel(selectedValue?.id.substring(1, selectedValue?.id.length)) ? "" : `https://www.wikidata.org/wiki/${selectedValue?.id}` }
        const linkedId = selectedValue ? (url ? (
            <a target="_blank"
                rel="noopener noreferrer"
                className="type-qnode"
                href={url}>
                {selectedValue.id}
            </a>
        ) : (<a>{selectedValue.id}</a>)) : null;
        const defaultValue = (searchFields as any)[type.value] || "";

        return (
            <div>
                <Form.Group as={Row} key={type.value} style={{ marginTop: "1rem" }}>
                    <Form.Label column sm="12" md="3" className="text-muted">{type.label}</Form.Label>
                    {
                        selectedValue ?
                            <Col sm="12" md="9">
                                <FontAwesomeIcon
                                    icon={faTimesCircle}
                                    className="clear-button"
                                    onClick={() => {
                                        const updatedFields = { ...this.props.fields };
                                        updatedFields[type.value as keyof AnnotationFields] = undefined;
                                        this.props.onChangeFields(updatedFields);
                                    }} />
                                <div className="selected-node" key={selectedValue.id}>
                                    <strong>{selectedValue.label}</strong>&nbsp;
                                    {linkedId}
                                    <br />
                                    {selectedValue.description}
                                </div>
                            </Col>
                            :
                            (
                                linkedBlockId ?
                                    <Col sm="12" md='9'>
                                        <Form.Control
                                            type="text" size="sm"
                                            value={linkedBlockSelection}
                                            readOnly />
                                    </Col>
                                    :
                                    <Col sm='12' md='9'>
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant="outline-dark"
                                            onClick={() => this.props.changeShowEntityMenu(type.label)}
                                            >
                                                Edit entity
                                            </Button>
                                    </Col>
                            )
                    }
                </Form.Group>

            </div>
        );
    }
}

export default NodeField;
