import React, { Component } from "react";
import { TreeMode } from '@/shared/types'
import Node from "./node";


interface TreeProps {
}

interface TreeState {

}

const fakeNodes = [
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
        {label: "node1",
        childNodes: [
        ]}
    ]}
]

class FileTree extends Component<TreeProps, TreeState> {

    renderNodes() {
        const fileList = [{name: "aaa", type: "Yamls"}, {name: "a11", type: "Wikifiers"}, {name: "a22", type: "DataFiles"}];
        const nodes = [];
        for (const n of fileList) {
            nodes.push( <li key={n.name}><Node name={n.name} type={n.type} /></li>)
        }
        return nodes;
    }

    render() {
        return (
            <ul>
                {this.renderNodes()}
            </ul>
        )
    }
}

export default FileTree;
