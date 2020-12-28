import React, { Component } from "react";
import { TreeMode } from '@/shared/types'


interface NodeProps {
    name: string;
    type: TreeMode;
}

interface NodeState {

}

class Node extends Component<NodeProps, NodeState> {
    constructor(props: NodeProps) {
        super(props);
    }

    onNodeClicked() {
        console.log("onNodeClicked: ", this.props.name);
    }

    onNodeRightClick() {
        console.log("onNodeRightClicked: ", this.props.name);
    }

    // TODO- add click and right click functions
    render() {
        return (
            <label onClick={() => this.onNodeClicked()} onContextMenu={() => this.onNodeRightClick()}>Node: {this.props.name}, {this.props.type}</label>
        )
    }
}

export default Node;