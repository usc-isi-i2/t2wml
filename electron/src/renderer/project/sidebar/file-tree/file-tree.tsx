import React, { Component } from "react";
import wikiStore from "../../../data/store";
// import { TreeMode } from '@/shared/types'
import FileNode, { NodeProps } from "./node";


interface TreeProps {
}

class FileTree extends Component<TreeProps, TreeState> {

    getFileTree(): NodeProps {
        const rootNode = { label: "Files", childNodes: [] } as NodeProps;
        const project = wikiStore.projects.projectDTO;
        if (!project || !project.data_files) { return rootNode; }
        for (const df of Object.keys(project.data_files).sort()) {
            const dataNode = {
                label: df,
                childNodes: []
            } as NodeProps;
            const sheet_arr = project.data_files[df].val_arr;
            for (const sheetname of sheet_arr) {
                const sheetNode = {
                    label: sheetname,
                    childNodes: []
                } as NodeProps;
                dataNode.childNodes.push(sheetNode)
            }
            rootNode.childNodes.push(dataNode)
        }
        return rootNode;
    }

    render() {
        const fileTree=this.getFileTree()
        return (
            <FileNode label={fileTree.label} childNodes={fileTree.childNodes} />
        )
    }
}

export default FileTree;
