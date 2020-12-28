import React, { Component } from "react";
// import { TreeMode } from '@/shared/types'
import FileNode from "./node";


interface TreeProps {
}

interface TreeState {

}

export interface Node {
    label: string;
    childNodes: Node[];
}

const fakeNodes: Node = 
    {label: "Root",
    childNodes: [
        {label: "node1",
        childNodes: [
            {label: "leaf1",
            childNodes: [

            ]},
            {label: "leaf2",
            childNodes: [

            ]}
        ]},
        {label: "node2",
        childNodes: [
        ]}
    ]};

class FileTree extends Component<TreeProps, TreeState> {

    render() {
        return (
            <FileNode label={fakeNodes.label} childNodes={fakeNodes.childNodes} />
        )
    }
}

export default FileTree;
