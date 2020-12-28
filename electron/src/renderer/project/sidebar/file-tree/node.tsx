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

        this.state = {
            collapsed: false,
        }
    }

    onClick() {
        this.setState({collapsed: !this.state.collapsed});
        console.log('clicked', this.state.collapsed)
    }

    onDoubleClick(e: React.MouseEvent) {
        console.log("onNodeDoubleClicked: ", e.currentTarget.innerHTML);
    }

    onRightClick(e: React.MouseEvent) {
        console.log("onNodeRightClicked: ", e.currentTarget.innerHTML);
    }

    render() {
        if (this.props.childNodes && !this.state.collapsed) {
            return (
                <li>
                    <ul>
                        <DoubleClick onClick={() => this.onClick()} onDoubleClick={(e) => this.onDoubleClick(e)}>
                        <label
                            onContextMenu={(e) => this.onRightClick(e)}>
                            {this.props.label}
                        </label>
                        </DoubleClick>
                        {this.props.childNodes.map((n: NodeProps) => <FileNode key={n.label} label={n.label} childNodes={n.childNodes} parentNode={n.parentNode} type={n.type}/>
                    )}
                    </ul>
                </li>
            )
        }
        return (
                <li key={this.props.label}>
                    <DoubleClick onClick={() => this.onClick()} onDoubleClick={(e) => this.onDoubleClick(e)}>
                        <label onClick={() => this.onClick()} onContextMenu={(child) => this.onRightClick(child)}>{this.props.label}</label>
                    </DoubleClick>
                </li>
        )
    }
}

export default FileNode;
