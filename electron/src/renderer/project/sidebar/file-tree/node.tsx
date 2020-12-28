import React, { Component } from "react";

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
    }

    onNodeClicked(child: React.MouseEvent) {
        console.log("onNodeClicked: ", child.currentTarget.innerHTML);
    }

    onNodeDoubleClicked(child: React.MouseEvent) {
        console.log("onNodeDoubleClicked: ", child.currentTarget.innerHTML);
    }

    onNodeRightClick(child: React.MouseEvent) {
        console.log("onNodeRightClicked: ", child.currentTarget.innerHTML);
    }

    renderChild(child: NodeProps) {
        if (child.childNodes) {
            return (
                <ul key={child.label}>
                    <label onClick={(child) => this.onNodeClicked(child)}
                           onContextMenu={(child) => this.onNodeRightClick(child)}
                           onDoubleClick={(child) => this.onNodeDoubleClicked(child)}>
                           {child.label}
                    </label>
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
