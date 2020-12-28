import React, { Component } from "react";
// import { TreeMode } from '@/shared/types'

interface NodeProps {
    label: string;
    childNodes: Node[];
    // type: TreeMode;
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

    onNodeRightClick(child: React.MouseEvent) {
        console.log("onNodeRightClicked: ", child.currentTarget.innerHTML);
    }

    renderChild(child: NodeProps) {
        if (child.childNodes) {
            return (
                <ul key={child.label}>
                    <label onClick={(child) => this.onNodeClicked(child)} onContextMenu={(child) => this.onNodeRightClick(child)}>{child.label}</label>
                    {child.childNodes.map((n: Node) => this.renderChild(n))}
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
