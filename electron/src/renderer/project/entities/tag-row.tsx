import React, { Component } from 'react';
import '../project.css';
import '../ag-grid.css';
import '../ag-theme-balham.css';

// App
import { Button, Col, Form, InputGroup, Modal, Row } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMinusSquare } from '@fortawesome/free-solid-svg-icons'

import { observer } from "mobx-react";
import wikiStore from '@/renderer/data/store';



export interface Tag {
    part1: string;
    part2: string;
    index: number;
}

interface EntitiesProperties {
    tag: Tag;
    updateField: (index:number, part: "part1"|"part2", value: string) => void;
    minusClick: (index: number) => void;
}


interface EntitiesState {
}


@observer
class TagRow extends Component<EntitiesProperties, EntitiesState> {
    constructor(props: EntitiesProperties) {
        super(props);
    }


    render() {
        const tag=this.props.tag;
        return (
            <InputGroup>
                    <Form.Control defaultValue={tag.part1 || ""}
                        onChange={(event) => (this.props.updateField(tag.index, "part1", event.target?.value))}
                    />
                    {":"}
                    <Form.Control defaultValue={tag.part2 || ""}
                        onChange={(event) => (this.props.updateField(tag.index, "part2", event.target?.value))}
                    /><FontAwesomeIcon icon={faMinusSquare} onClick={() => this.props.minusClick(this.props.tag.index)} />
            </InputGroup>

        );
    }
}

export default TagRow;
