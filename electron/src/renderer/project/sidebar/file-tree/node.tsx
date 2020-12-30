
import React, { Component } from "react";
import DoubleClick from "./double-click-HOC";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {IconDefinition, faChevronDown, faChevronRight, faTable,  faStream, faColumns, faFile, faProjectDiagram, faList} from '@fortawesome/free-solid-svg-icons';


export type NodeType = "DataFile" | "Sheet" | "Label" | "Yaml" | "Annotation" | "Wikifier" | "Entity"
const nodeToIconMapping={
  "DataFile": faTable,
  "Sheet": faFile,
  "Label": null,
  "Yaml": faStream,
  "Annotation": faColumns,
  "Wikifier": faList,
  "Entity": faProjectDiagram,
  };

export interface NodeProps {
  id: string;
  label: string;
  parentNode: NodeProps | null;
  childNodes: NodeProps[];
  type: NodeType;
  bolded?: boolean;
  doubleClick: (node: NodeProps) => void,
  rightClick: (node:NodeProps) => any,
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


  onArrowClick() {
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
    if (this.props.childNodes.length && !this.state.collapsed) {
      childrenNodes = (<ul>
        {this.props.childNodes.map((n: NodeProps) =>
        <FileNode key={n.id}
          id={n.id}
          label={n.label}
          bolded={n.bolded}
          childNodes={n.childNodes}
          parentNode={n.parentNode}
          type={n.type}
          rightClick={n.rightClick}
          doubleClick={n.doubleClick} />)}
      </ul>)
    }

    let arrowIcon=<em>{'\u00A0\u00A0'}</em> //align with entries that do have an arrow icon
    if (this.props.childNodes.length){
      arrowIcon=(<span
        onClick={() => this.onArrowClick()}
      >{this.state.collapsed ? <FontAwesomeIcon icon={faChevronRight} size="xs"/>:<FontAwesomeIcon icon={faChevronDown} size="xs"/>}</span>)
    }

    let typeIcon=null;
    if (nodeToIconMapping[this.props.type] &&  nodeToIconMapping[this.props.type] as IconDefinition){
      typeIcon=<FontAwesomeIcon icon={nodeToIconMapping[this.props.type] as IconDefinition} size="xs" />
    }

    let label = this.props.bolded ? <b>{this.props.label}</b>: this.props.label

    return (
      <li>
          <label
            onContextMenu={(e) => this.onRightClick(e)}
            onDoubleClick={() => this.onDoubleClick()}>
            {arrowIcon} <span>{typeIcon} {label}</span>
          </label>
        {childrenNodes}
      </li>
    )
  }
}

export default FileNode;
