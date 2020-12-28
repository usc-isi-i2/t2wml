import React, { Component } from "react";
import DoubleClick from "./double-click-HOC";

export type NodeType = "Datafile" | "Sheet" | "Label" | "Yaml" | "Annotation" | "Wikifier" | "Entity"

export interface NodeProps {
    label: string;
    parentNode: NodeProps | null;
    childNodes: NodeProps[];
    type: NodeType;
}

interface NodeState {
    collapsed: boolean;
}

class FileNode extends Component<NodeProps, NodeState> {
    constructor(props: NodeProps) {
        super(props);
        this.state={
            collapsed: false
        }

    }

    onClick(target) {
        console.log("onNodeClicked: ", target.innerHTML);
    }

    onDoubleClick(e: React.MouseEvent) {
        console.log("onNodeDoubleClicked: ", e.currentTarget.innerHTML);
    }

    onRightClick(e: React.MouseEvent) {
        console.log("onNodeRightClicked: ", e.currentTarget.innerHTML);
    }

    renderChild(child: NodeProps) {
        if (child.childNodes ) {
            return (
                <ul key={child.label}>
                    <DoubleClick onClick={(e) => this.onClick(e)} onDoubleClick={(e) => this.onDoubleClick(e)}>
                    <label
                           onContextMenu={(e) => this.onRightClick(e)}>
                           {child.label}
                    </label>
                    </DoubleClick>
                    {child.childNodes.map((n: NodeProps) => this.renderChild(n))}
                </ul>
            )
        }
        return <li>{child.label}</li>
    }

    render() {
        return this.renderChild(this.props);
    }
}

export default FileNode;
