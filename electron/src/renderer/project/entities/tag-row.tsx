import React, { Component } from 'react';
import '../project.css';
import '../ag-grid.css';
import '../ag-theme-balham.css';

// App
import { Button, Col, Form, Modal, Row } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMinusSquare } from '@fortawesome/free-solid-svg-icons'

import { observer } from "mobx-react";
import wikiStore from '@/renderer/data/store';



export interface Tag{
    part1: string;
    part2: string;
}

interface EntitiesProperties {
    tag: Tag;
    updateField: (key: string, value:string) => void;
}


interface EntitiesState {
}


@observer
class TagRow extends Component<EntitiesProperties, EntitiesState> {
    constructor(props: EntitiesProperties) {
        super(props);
    }


    render() {
        return (
            <Form.Group>
            <Row>

                        <Form.Control defaultValue={this.props.tag.part1 || ""}
                            onChange={(event) => (this.props.tag.part1= event.target?.value)}
                        />

                        <Form.Control defaultValue={this.props.tag.part1 || ""}
                            onChange={(event) => (this.props.tag.part2= event.target?.value)}
                        />
            <FontAwesomeIcon icon={faMinusSquare} onClick={()=>null}/>
            </Row>
            </Form.Group>

        );
    }
}

export default TagRow;
