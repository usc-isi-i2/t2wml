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
    part1: string;
    part2: string;
    index: number;
}

interface TagProperties {
    tag: Tag;
    updateField: (index:number, part: "part1"|"part2", value: string, errorMsg: string) => void;
    minusClick: (index: number) => void;
}

interface TagState{
    errorMsg: string;
}


@observer
class TagRow extends Component<TagProperties, TagState> {
    constructor(props: TagProperties) {
        super(props);
        this.state = {
            errorMsg : this.checkForError(this.props.tag.part1, this.props.tag.part2)
        }
    }

    checkForError(part1: string, part2: string): string{
        let errorMsg=""
        if (part1.includes(":") || part2.includes(":")){
            errorMsg="tag parts cannot contain a colon"
            return errorMsg;
        }
        if (!part1 && part2){
            errorMsg+="cannot have empty tag part 1 but filled tag part 2"
        }
        return errorMsg
    }

    updateField(index: number, part: "part1" | "part2", value: string){
        let part1=this.props.tag.part1;
        let part2=this.props.tag.part2;

        if (part=="part1"){
            part1=value;
        }else{
            part2=value;
        }
        let errorMsg= this.checkForError(part1, part2);
        this.props.updateField(index, part, value, errorMsg)
        this.setState({errorMsg})
    }


    render() {
        const tag=this.props.tag;
        return (<span>
            <InputGroup>
                    <Form.Control defaultValue={tag.part1 || ""}
                        onChange={(event) => (this.updateField(tag.index, "part1", event.target?.value))}
                    />
                    {":"}
                    <Form.Control defaultValue={tag.part2 || ""}
                        onChange={(event) => (this.updateField(tag.index, "part2", event.target?.value))}
                    /><FontAwesomeIcon icon={faMinusSquare} size="lg" onClick={() => this.props.minusClick(this.props.tag.index)} />
            </InputGroup>
                            <Form.Label style={{ color: 'red' }}>
                            {this.state.errorMsg}
                          </Form.Label>
                          </span>

        );
    }
}

export default TagRow;
