
import React, { Component } from "react";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { IconDefinition, faChevronDown, faChevronRight, faTable, faStream, faColumns, faFile, faProjectDiagram, faList } from '@fortawesome/free-solid-svg-icons';
import { OverlayTrigger, Tooltip } from "react-bootstrap";
import './node.css';


export type NodeType = "DataFile" | "SingleSheetDataFile" | "Sheet" | "Label" | "Yaml" | "Annotation" | "Wikifier" | "Entity"
const nodeToIconMapping = {
  "DataFile": faTable,
  "SingleSheetDataFile": faTable,
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
  onClick: (node: NodeProps) => void,
  rightClick: (node: NodeProps) => any,
}

interface NodeState {
  expanded: boolean;
}

class FileNode extends Component<NodeProps, NodeState> {

  constructor(props: NodeProps) {
    super(props);
    this.state = {
      expanded: props.type == "Label" || props.bolded == true
    }
  }

  componentDidUpdate(prevProps: NodeProps) {
    if ((prevProps.bolded !== this.props.bolded) && this.props.bolded) {
      this.setState({ expanded: true });
    }
  }

  onArrowClick() {
    this.setState({ expanded: !this.state.expanded });
  }

  async onNodeClick() {
    this.setState({ expanded: true });
    this.props.onClick(this.props);
  }

  onRightClick(event: any) {
    event.preventDefault();
    this.props.rightClick(this.props);
  }
  render() {
    let childrenNodes = null;
    let propChildren = this.props.childNodes;

    if (propChildren.length && this.state.expanded) {
      if (this.props.type == "SingleSheetDataFile") {
        propChildren = propChildren[0].childNodes
      }

      childrenNodes = (<ul>
        {propChildren.map((n: NodeProps) =>
          <FileNode key={n.id}
            id={n.id}
            label={n.label}
            bolded={n.bolded}
            childNodes={n.childNodes}
            parentNode={n.parentNode}
            type={n.type}
            rightClick={n.rightClick}
            onClick={n.onClick} />)}
      </ul>)

    }

    let arrowIcon = <em>{'\u00A0\u00A0'}</em> //align with entries that do have an arrow icon
    if (propChildren.length) {
      if (this.state.expanded) {
        arrowIcon = <FontAwesomeIcon icon={faChevronDown} size="xs" onClick={() => this.onArrowClick()} />
      } else {
        arrowIcon = <FontAwesomeIcon icon={faChevronRight} size="xs" onClick={() => this.onArrowClick()} />
      }
    }

    let typeIcon = null;
    if (nodeToIconMapping[this.props.type]) {
      typeIcon = <FontAwesomeIcon icon={nodeToIconMapping[this.props.type] as IconDefinition} size="xs" />
    }

    const labelText = this.props.bolded ? <b>{this.props.label}</b> : this.props.label

    const logoTooltipHtml = (
      <Tooltip /*style={{ width: "fit-content" }}*/ id="navbar-tooltip">
        {this.props.label}
      </Tooltip>
    );

    return (
      <li>
        <OverlayTrigger overlay={logoTooltipHtml} delay={{ show: 1000, hide: 0 }} placement="top" trigger={["hover", "focus"]}>
          <label className="pointer ellipsis"
            onContextMenu={(e) => this.onRightClick(e)}

          >
            {arrowIcon} <span onClick={() => this.onNodeClick()}>{typeIcon} {labelText}</span>
          </label>
        </OverlayTrigger>
        {childrenNodes}
      </li>
    )
  }
}
export default FileNode;
