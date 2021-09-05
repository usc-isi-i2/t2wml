
import React, { Component } from "react";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { IconDefinition, faChevronDown, faChevronRight, faTable, faStream, faColumns, faFile, faProjectDiagram, faList } from '@fortawesome/free-solid-svg-icons';
import { OverlayTrigger, Tooltip } from "react-bootstrap";
import './node.css';
import path from "path";
import Draggable, { DraggableData, DraggableEvent } from "react-draggable";
import RequestService from "@/renderer/common/service";


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
  parentNode?: NodeProps;
  childNodes: NodeProps[];
  type: NodeType;
  bolded?: boolean;
  onClick: (node: NodeProps) => void,
  rightClick: (node: NodeProps) => any,
}

interface NodeState {
  expanded: boolean;
  activeDrags: number;
  deltaPosition: { x: number; y: number };
}

class FileNode extends Component<NodeProps, NodeState> {

  private requestService: RequestService;

  constructor(props: NodeProps) {
    super(props);

    this.requestService = new RequestService();

    this.state = {
      activeDrags: 0,
      expanded: props.type == "Label" || props.bolded == true,
      deltaPosition: {
        x: 0, y: 0
      },
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

  onStart() {
    // this.setState({  });
    return;
  }

  onStop(event: DraggableEvent, data: DraggableData) {
    const target = event.target as HTMLInputElement;
    if (data.node.classList.contains("drop-target")
      && this.props.label !== target.id) {
      // TODO
      console.log(target.id)
      this.requestService.copyAnnotation(this.props.label, target.id);
    }
    this.setState({ deltaPosition: { x: 0, y: 0 } });
  }

  handleDrag(e: DraggableEvent, data: DraggableData) {
    const { y } = this.state.deltaPosition;
    this.setState({
      deltaPosition: {
        x: 0,
        y: y + data.deltaY,
      }
    });
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

    const noPathLabelText = path.parse(this.props.label).base
    const labelText = this.props.bolded ? <b>{noPathLabelText}</b> : noPathLabelText

    const logoTooltipHtml = (
      <Tooltip /*style={{ width: "fit-content" }}*/ id="navbar-tooltip">
        {this.props.label}
      </Tooltip>
    );

    return (
      <li id={this.props.label}>
        <Draggable axis="y" position={this.state.deltaPosition}
          onDrag={(e: DraggableEvent, data: DraggableData) => this.handleDrag(e, data)}
          onStart={() => this.onStart()}
          onStop={(e: DraggableEvent, data: DraggableData) => this.onStop(e, data)}
        >
          <div className="drop-target" id={this.props.label}>
            <OverlayTrigger overlay={logoTooltipHtml} delay={{ show: 1000, hide: 0 }} placement="top" trigger={["hover", "focus"]}>
              <label className="pointer ellipsis"
                onContextMenu={(e) => this.onRightClick(e)}
                id={this.props.label}
              >
                {arrowIcon} <span id={this.props.label} onClick={() => this.onNodeClick()}>{typeIcon} {labelText}</span>
              </label>

            </OverlayTrigger>
          </div>
        </Draggable>
        {childrenNodes}
      </li>
    )
  }
}
export default FileNode;
