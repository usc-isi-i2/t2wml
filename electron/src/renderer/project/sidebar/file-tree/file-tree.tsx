import React, { Component } from "react";
import wikiStore from "../../../data/store";
// import { TreeMode } from '@/shared/types'
import FileNode, {NodeProps} from "./node";


interface TreeProps {
}

interface TreeState {

}

const fakeNodes: NodeProps =
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

    getFileTree(): NodeProps {
        const rootNode={label: "Files", childNodes: []} as NodeProps;
        const project = wikiStore.projects.projectDTO;
        if (!project || !project.data_files) { return rootNode; }
        return rootNode;
    }

    render() {
        return (
            <FileNode label={fakeNodes.label} childNodes={fakeNodes.childNodes} />
        )
    }
}

export default FileTree;
