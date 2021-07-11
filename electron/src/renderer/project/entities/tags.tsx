import React, { Component } from 'react';
import '../project.css';
import '../ag-grid.css';
import '../ag-theme-balham.css';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlusSquare } from '@fortawesome/free-solid-svg-icons'

import { observer } from "mobx-react";
import TagRow from './tag-row';
import { QNode } from '@/renderer/common/dtos';


interface TagsProperties {
    property: string;
    propertyData: QNode;
    updateTags: (tags?: { [key: string]: string }) => void;
    updateTag: (key: string, part: 'key' | 'value', hasError: boolean, newValue: string) => void;
}


@observer
class Tags extends Component<TagsProperties, {}> {

    constructor(props: TagsProperties) {
        super(props);
    }

    onPlusClick() {
        let tags: { [key: string]: string } = {};
        const { propertyData } = this.props;
        console.log("onPlusClick", propertyData, propertyData["tags"])
        if (propertyData["tags"]) {
            tags = propertyData["tags"];
        }
        tags[""] = ""
        this.props.updateTags(tags)
    }

    onMinusClick(key: string) {
        const { propertyData } = this.props
        const tags = propertyData["tags"];
        if (tags && tags[key]) {
            delete tags[key]
        }
        this.props.updateTags(tags)
    }

    onEditField(key: string, part: 'key' | 'value', newValue: string, errorMsg: string) {
        this.props.updateTag(key, part, errorMsg? true : false, newValue);
    }


    render() {
        const { propertyData } = this.props;
        if (propertyData["data_type"] == undefined) {
            return null;
        }
        const tags = propertyData["tags"];

        const renderedTags = tags
            ?
            Object.keys(tags).map((k, i) => {
                console.log("render tags", i, k, tags[k])
                return (
                    <li key={i}>
                        <TagRow
                            tag={{ key: k, value: tags[k] }}
                            updateField={(key: string, part: "key" | "value", newValue: string, errorMsg: string) => this.onEditField(key, part, newValue, errorMsg)}
                            minusClick={(key: string) => this.onMinusClick(key)}
                        />
                    </li>
                )
            })
            : [];


        return (
            <ul>
                <label>Tags:  <FontAwesomeIcon icon={faPlusSquare} size="lg" onClick={() => this.onPlusClick()} /></label>
                {renderedTags}
            </ul>
        );
    }
}

export default Tags;
