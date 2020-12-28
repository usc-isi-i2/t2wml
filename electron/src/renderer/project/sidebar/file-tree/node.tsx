import React, { Component } from "react";
// import { TreeMode } from '@/shared/types'

export interface NodeProps {
    label: string;
    childNodes: NodeProps[];
    // type: TreeMode;
}

interface NodeState {
    collapsed: boolean;
}

class FileNode extends Component<NodeProps, NodeState> {
    constructor(props: NodeProps) {
        super(props);

        this.state = {
            collapsed: false,
        }
    }

    onNodeClicked() {
        this.setState({collapsed: !this.state.collapsed});
    }

    onNodeRightClick(child: React.MouseEvent) {
        console.log("onNodeRightClicked: ", child.currentTarget.innerHTML);
    }

    render() {
        if (this.props.childNodes && !this.state.collapsed) {
            return (
                <ul key={this.props.label}>
                    <label onClick={() => this.onNodeClicked()} onContextMenu={(child) => this.onNodeRightClick(child)}>{this.props.label}</label>
                    {this.props.childNodes.map((n: NodeProps) => 
                        <FileNode key={n.label} label={n.label} childNodes={n.childNodes} />
                    )}
                </ul>
            )
        }
        return (
            <ul key={this.props.label}>
                <label onClick={() => this.onNodeClicked()} onContextMenu={(child) => this.onNodeRightClick(child)}>{this.props.label}</label>
            </ul>
        )
    }
}

export default FileNode;
