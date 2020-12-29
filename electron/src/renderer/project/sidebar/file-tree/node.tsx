
import React, { Component } from "react";

import DoubleClick from "./double-click-HOC";

export type NodeType = "DataFile" | "Sheet" | "Label" | "Yaml" | "Annotation" | "Wikifier" | "Entity"

export interface NodeProps {
  label: string;
  parentNode: NodeProps | null;
  childNodes: NodeProps[];
  type: NodeType;
  doubleClick: (node: NodeProps) => void,
  rightClick: (node:NodeProps) => any
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
    this.setState({ collapsed: !this.state.collapsed });
  }

  async onDoubleClick() {
    this.props.doubleClick(this.props);
  }

  onRightClick(event: any){
      event.preventDefault();
      this.props.rightClick(this.props);
  }

  render() {
    let childrenNodes = null;
    if (this.props.childNodes && !this.state.collapsed) {
      childrenNodes = (<ul>
        {this.props.childNodes.map((n: NodeProps) => 
        <FileNode key={n.label} 
          label={n.label} 
          childNodes={n.childNodes} 
          parentNode={n.parentNode} 
          type={n.type}
          rightClick={n.rightClick}
          doubleClick={n.doubleClick} />)}
      </ul>)
    }

    return (
      <li>
        <DoubleClick onClick={() => this.onClick()} onDoubleClick={() => this.onDoubleClick()}>
          <label
            onContextMenu={(e) => this.onRightClick(e)}>
            {this.props.label}
          </label>
        </DoubleClick>
        {childrenNodes}
      </li>
    )
  }
}

export default FileNode;
