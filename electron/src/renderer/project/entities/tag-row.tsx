import React, { Component } from 'react';
import '../project.css';
import '../ag-grid.css';
import '../ag-theme-balham.css';

// App
import { Form, InputGroup } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMinusSquare } from '@fortawesome/free-solid-svg-icons'

import { observer } from "mobx-react";

export interface Tag {
    key: string;
    value: string;
}

interface TagProperties {
    tag: Tag;
    updateField: (key: string, part: "key"|"value", newValue: string, errorMsg: string) => void;
    minusClick: (key: string) => void;
}

interface TagState {
    errorMsg: string;
}


@observer
class TagRow extends Component<TagProperties, TagState> {
    constructor(props: TagProperties) {
        super(props);
        this.state = {
            errorMsg: this.checkForError(this.props.tag.key, this.props.tag.value)
        }
    }

    checkForError(key: string, value: string): string {
        let errorMsg = ""
        if (key.includes(":") || value.includes(":")) {
            errorMsg = "tag parts cannot contain a colon"
            return errorMsg;
        }
        if (!key && value) {
            errorMsg += "cannot have empty tag part 1 but filled tag part 2"
        }
        return errorMsg
    }

    updateField(part: "key" | "value", newValue: string) {
        let key = this.props.tag.key;
        let value = this.props.tag.value;

        if (part == "key") {
            key = newValue;
        } else {
            value = newValue;
        }
        const errorMsg = this.checkForError(key, value);
        this.props.updateField(this.props.tag.key, part, newValue, errorMsg)
        this.setState({ errorMsg })
    }


    render() {
        const { tag } = this.props;
        return (<span>
            <InputGroup>
                <Form.Control defaultValue={tag.key || ""}
                    onChange={(event) => (this.updateField("key", event.target?.value))}
                />
                {":"}
                <Form.Control defaultValue={tag.value || ""}
                    onChange={(event) => (this.updateField("value", event.target?.value))}
                /><FontAwesomeIcon icon={faMinusSquare} size="lg" onClick={() => this.props.minusClick(this.props.tag.key)} />
            </InputGroup>
            <Form.Label style={{ color: 'red' }}>
                {this.state.errorMsg}
            </Form.Label>
        </span>

        );
    }
}

export default TagRow;
