import React, { Component } from 'react';
import '../project.css';
import '../ag-grid.css';
import '../ag-theme-balham.css';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlusSquare } from '@fortawesome/free-solid-svg-icons'

import { observer } from "mobx-react";
import TagRow, { Tag } from './tag-row';



interface TagsProperties {
    property: string;
    propertyData: any;
    updateTags: (tags: string[]) => void;
    updateTag: (index:number, value:string, hasError:boolean) => void;
}


@observer
class Tags extends Component <TagsProperties, {}> {
    private listItemKey = 0; // list-item key - for making sure each <li> has a specific key
    constructor(props: TagsProperties) {
        super(props);
        /*let isProperty = false;

        if (isProperty) {

        } */
    }

    onPlusClick() {
        let tagArr = [] as string[];
        if (this.props.propertyData["tags"]) {
            tagArr = [...this.props.propertyData["tags"]];
        }
        tagArr.push("")
        this.props.updateTags(tagArr)
    }

    onMinusClick(index: number) {
        const tagArr = [...this.props.propertyData["tags"]];
        tagArr.splice(index, 1)
        this.listItemKey+=1
        this.props.updateTags(tagArr)
    }

    onEditField(index: number, part: "part1" | "part2", value: string, errorMsg:string) {
        let hasError=false;
        if (errorMsg){
            hasError=true;
        }
        if (errorMsg.includes("colon")){
            //we can't split it properly, we don't send updated value at all
            this.props.updateTag(index, this.props.propertyData["tags"][index], hasError);
            return;
        }
        const tag = this.backTagtoTag(index, this.props.propertyData["tags"][index])
        tag[part] = value
        this.props.updateTag(index, tag.part1 + ":" + tag.part2, hasError);
    }

    backTagtoTag(index:number, backTag:string): Tag{
        let tag;
        if (backTag == "") {
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
        if (this.props.propertyData["data_type"] == undefined) {
            return null;
        }
        const renderedTags = [];

        const backendTags = this.props.propertyData["tags"];
        if (backendTags) {
            for (const [index, backTag] of backendTags.entries()) {

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
                <label>Tags:  <FontAwesomeIcon icon={faPlusSquare} onClick={() => this.onPlusClick()} /></label>
                    {renderedTags}
                </ul>
        );
    }
}

export default Tags;
