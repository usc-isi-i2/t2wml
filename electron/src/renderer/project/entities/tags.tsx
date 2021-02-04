import React, { Component } from 'react';
import '../project.css';
import '../ag-grid.css';
import '../ag-theme-balham.css';

// App
import { Button, Col, Form, Modal, Row } from 'react-bootstrap';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlusSquare } from '@fortawesome/free-solid-svg-icons'

import { observer } from "mobx-react";
import TagRow, { Tag } from './tag-row';



interface EntitiesProperties {
    property: string;
    propertyData: any;
    updateField: (key: string, value: string) => void;
}


interface EntitiesState {
    tags: Tag[]
}


@observer
class Tags extends Component<EntitiesProperties, EntitiesState> {
    constructor(props: EntitiesProperties) {
        super(props);
        let isProperty = false;
        const interfaceTags = [];

        if (isProperty) {
            const backendTags = props.propertyData["tags"]

            if (backendTags) {
                for (const backTag of backendTags) {
                    const splitParts = backTag.split(":")
                    interfaceTags.push({ part1: splitParts[0], part2: splitParts[-1] })
                }
            }
        }

        this.state = {
            tags: interfaceTags
        }
    }

    onPlusClick() {
        console.log("clicked plus");
    }


    render() {

        if (this.props.propertyData["data_type"]==undefined){
            return null;
        }



        const renderedTags = [];
        for (const [index, element] of this.state.tags.entries()) {
            renderedTags.push(
                <li id={this.props.property + index}>
                    <TagRow
                        tag={element}
                        updateField={() => null}
                    />
                </li>
            );
        }
        return (
            <Row>
                <label>Tags:</label>
                <FontAwesomeIcon icon={faPlusSquare} onClick={() => this.onPlusClick()} />
                <ul>{renderedTags}</ul>
            </Row>
        );
    }
}

export default Tags;
