import React, { Component } from 'react';
import '../project.css';
import '../ag-grid.css';
import '../ag-theme-balham.css';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlusSquare } from '@fortawesome/free-solid-svg-icons'

import { observer } from "mobx-react";
import TagRow, { Tag } from './tag-row';
import { QNode } from '@/renderer/common/dtos';



interface TagsProperties {
    property: string;
    propertyData: QNode;
    updateTags: (tags?:{[key: string]: string}) => void;
    updateTag: (index:string, hasError:boolean, value?:string) => void;
}


@observer
class Tags extends Component <TagsProperties, {}> {
    private listItemKey = 0; // list-item key - for making sure each <li> has a specific key
    constructor(props: TagsProperties) {
        super(props);
        /*let is_property = false;

        if (is_property) {

        } */
    }

    onPlusClick() {
        let tagArr: {[key: string]: string} = {};
        const { propertyData } = this.props;
        if (propertyData["tags"]) {
            tagArr = propertyData["tags"];
        }
        tagArr[''] = ""
        this.props.updateTags(tagArr)
    }

    onMinusClick(index: string) {
        const { propertyData } = this.props
        const tagArr = propertyData["tags"];
        if (tagArr) {
            delete tagArr[index]
        }
        this.listItemKey+=1
        this.props.updateTags(tagArr)
    }

    onEditField(index: string, part: "part1" | "part2", value: string, errorMsg:string) {
        const { propertyData } = this.props;
        let hasError=false;
        if (errorMsg){
            hasError=true;
        }
        if (errorMsg.includes("colon")){
            //we can't split it properly, we don't send updated value at all
            this.props.updateTag(index, hasError, propertyData["tags"] ? propertyData["tags"][index]: undefined);
            return;
        }
        const tag = this.backTagtoTag(index,  propertyData["tags"] ?propertyData["tags"][index]: undefined)
        tag[part] = value
        this.props.updateTag(index, hasError, tag.part1 + ":" + tag.part2);
    }

    backTagtoTag(index:string, backTag?:string): Tag{
        let tag;
        if (backTag == "" || backTag==undefined) {
            tag = { part1: "", part2: "", index: index }
        } else {
            const splitParts = backTag.split(":")
            const part1= splitParts[0] || "";
            const part2= splitParts[splitParts.length-1] || "";
            tag = { part1: part1, part2: part2, index: index }
        }
        return tag

    }


    render() {
        const { propertyData } = this.props;
        if (propertyData["data_type"] == undefined) {
            return null;
        }
        const renderedTags = [];

        const backendTags = propertyData["tags"];
        if (backendTags) {
            for (const [index, backTag] of Object.keys(backendTags)) {

                const tag = this.backTagtoTag(index, backTag)
                const key = `${index}_${this.listItemKey}`;

                renderedTags.push(
                    <li key={key}>
                        <TagRow
                            tag={tag}
                            updateField={(index, part, value, errorMsg) => this.onEditField(index, part, value, errorMsg)}
                            minusClick={(index) => this.onMinusClick(index)}
                        />
                    </li>
                );
            }
        }

        return (
                <ul>
                <label>Tags:  <FontAwesomeIcon icon={faPlusSquare} size="lg" onClick={() => this.onPlusClick()} /></label>
                    {renderedTags}
                </ul>
        );
    }
}

export default Tags;
