
import React, { Component } from "react";

import DoubleClick from "./double-click-HOC";
import { Menu, Item, Separator, Submenu, useContextMenu } from 'react-contexify';


export type NodeType = "DataFile" | "Sheet" | "Label" | "Yaml" | "Annotation" | "Wikifier" | "Entity"

export interface NodeProps {
  label: string;
  parentNode: NodeProps | null;
  childNodes: NodeProps[];
  type: NodeType;
  doubleClick: any,
  rightClick: any
}

interface NodeState {
  collapsed: boolean;
}

const { show }  = useContextMenu({
  id: 'blahblah',
});

class FileNode extends Component<NodeProps, NodeState> {

    private MENU_ID: string;
  constructor(props: NodeProps) {
    super(props);

    this.state = {
      collapsed: false,
    }

    this.MENU_ID = 'blahblah';
  }



  onClick() {
    this.setState({ collapsed: !this.state.collapsed });
  }

  async onDoubleClick() {
    this.props.doubleClick(this.props)
  }

  onRightClick(event: any){
      event.preventDefault();
      this.props.rightClick(this.props)
  }

  render() {
    let childrenNodes = null;
    if (this.props.childNodes && !this.state.collapsed) {
      childrenNodes = (<ul>
        {this.props.childNodes.map((n: NodeProps) => <FileNode key={n.label} label={n.label} childNodes={n.childNodes} parentNode={n.parentNode} type={n.type} />)}
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

        <Menu id={this.MENU_ID}>
          <Item onClick={()=> console.log("clicked")}>Item 1</Item>
          <Item onClick={()=> console.log("clicked")}>Item 2</Item>
          <Separator />
          <Item disabled>Disabled</Item>
          <Separator />
          <Submenu label="Foobar">
            <Item onClick={()=> console.log("clicked")}>Sub Item 1</Item>
            <Item onClick={()=> console.log("clicked")}>Sub Item 2</Item>
          </Submenu>
      </Menu>
      </li>
    )
  }
}

export default FileNode;
