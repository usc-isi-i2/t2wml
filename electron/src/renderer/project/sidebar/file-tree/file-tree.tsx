import React, { Component } from "react";
import wikiStore from "../../../data/store";
// import { TreeMode } from '@/shared/types'
import FileNode, { NodeProps, NodeType } from "./node";


interface TreeProps {
}

interface TreeState {

}


class FileTree extends Component<TreeProps, TreeState> {

    getSubFileTree(projDict: any, df: string, sheetName: string, label: string, type: NodeType, parentNode: NodeProps) {
        if (!projDict[df] || !projDict[df][sheetName]) {
            return;
        }
        const labelNode = {
            label: label,
            childNodes: [],
            type: "Label"
        } as NodeProps;

        for (const filename of projDict[df][sheetName]["val_arr"]) {
            labelNode.childNodes.push(
                {
                    label: filename,
                    childNodes: [] as NodeProps[],
                    type: type
                }
            )
        }
        parentNode.childNodes.push(labelNode);
    }

    getFileTree(): NodeProps {
        const rootNode = { label: "Files", childNodes: [], type: "Label" } as NodeProps;
        const project = wikiStore.projects.projectDTO;
        if (!project || !project.data_files) { return rootNode; }
        for (const df of Object.keys(project.data_files).sort()) {
            const dataNode = {
                label: df,
                childNodes: [],
                type: "Datafile"
            } as NodeProps;
            const sheet_arr = project.data_files[df].val_arr;
            for (const sheetName of sheet_arr) {
                const sheetNode = {
                    label: sheetName,
                    childNodes: [],
                    type: "Sheet"
                } as NodeProps;
                this.getSubFileTree(project.yaml_sheet_associations, df, sheetName, "Yaml files", "Yaml", sheetNode)
                this.getSubFileTree(project.annotations, df, sheetName, "Annotation files", "Annotation", sheetNode)
                dataNode.childNodes.push(sheetNode)
            }
            rootNode.childNodes.push(dataNode)
        }
        return rootNode;
    }

    render() {
        const fileTree = this.getFileTree()
        return (
            <FileNode label={fileTree.label} childNodes={fileTree.childNodes} type={fileTree.type} />
        )
    }
}

export default FileTree;
