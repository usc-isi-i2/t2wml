import React, { Component } from "react";
// import { TreeMode } from '@/shared/types'
import { Node } from './file-tree';


interface NodeProps {
    label: string;
    childNodes: Node[];
    // type: TreeMode;
}

interface NodeState {

}

class FileNode extends Component<Node, NodeState> {
    constructor(props: NodeProps) {
        super(props);
    }

    onNodeClicked() {
        console.log("onNodeClicked: ", this.props.label);
    }

    onNodeRightClick() {
        console.log("onNodeRightClicked: ", this.props.label);
    }

    renderChild(child: Node) {
        if (child.childNodes) {
            return (
                <ul key={child.label}>
                    <label onClick={() => this.onNodeClicked()} onContextMenu={() => this.onNodeRightClick()}>{child.label}</label>
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