
import React, { Component } from "react";
import DoubleClick from "./double-click-HOC";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {faChevronDown, faChevronRight, faTable,  faStream, faColumns, faFile, IconDefinition} from '@fortawesome/free-solid-svg-icons';


export type NodeType = "DataFile" | "Sheet" | "Label" | "Yaml" | "Annotation" | "Wikifier" | "Entity"
const nodeToIconMapping={
  "DataFile": faTable,
  "Sheet": faFile,
  "Label": null, //todo?
  "Yaml": faStream,
  "Annotation": faColumns,
  "Wikifier": null, //todo
  "Entity": null, //todo
  };

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
        <FileNode key={n.label}
          label={n.label}
          childNodes={n.childNodes}
          parentNode={n.parentNode}
          type={n.type}
          rightClick={n.rightClick}
          doubleClick={n.doubleClick} />)}
      </ul>)
    }

    let arrowIcon=null;
    if (this.props.childNodes.length){
      arrowIcon=(<span
        className="action-download"
        style={{ display: "inline-block", width: "33%", cursor: "pointer", textAlign: "center" }}
        onClick={() => this.onArrowClick()}
      >
        {this.state.collapsed ? <FontAwesomeIcon icon={faChevronRight} size="xs" /> : <FontAwesomeIcon icon={faChevronDown} size="xs" />}
      </span>)
    }

    let typeIcon=null;
    if (nodeToIconMapping[this.props.type] &&  nodeToIconMapping[this.props.type] as IconDefinition){
      typeIcon=<FontAwesomeIcon icon={nodeToIconMapping[this.props.type] as IconDefinition} size="xs" />
    }

    return (
      <li>
          <label
            onContextMenu={(e) => this.onRightClick(e)}
            onDoubleClick={() => this.onDoubleClick()}>
            {arrowIcon}{typeIcon}{this.props.label}
          </label>
        {childrenNodes}
      </li>
    )
  }
}

export default FileNode;
