
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
  dataFile: string;
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
  position: { x: number; y: number };
}

class FileNode extends Component<NodeProps, NodeState> {

  private requestService: RequestService;

  constructor(props: NodeProps) {
    super(props);

    this.requestService = new RequestService();

    this.state = {
      activeDrags: 0,
      expanded: props.type == "Label" || props.bolded == true,
      position: {
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

  getDivAnnotation(el: HTMLElement) {
    let i = 0;
    while (i < 5 && el.parentElement) {
      if (el.nodeName.toLowerCase() == "div") {
        return el;
      }
      i += 1;
      el = el.parentElement;
    }
  }

  getParnetInTree(div: HTMLElement, parentNum: 1 | 2) {
    const locInTree = parentNum === 1 ? 3 : 5
    let liDatafile = div;
    for (let i = 0; i < locInTree; i++) {
      if (liDatafile.parentElement) {
        liDatafile = liDatafile.parentElement;
      }
    }
    return liDatafile;
  }

  onStop(event: DraggableEvent, draggableData: DraggableData) {
    //  draggableData.node.id === this.props.label
    const target = event.target as HTMLInputElement;
    const divTarget = this.getDivAnnotation(target)
    if (divTarget && divTarget.id && divTarget.classList.contains("drop-target")
      && draggableData.node.id !== divTarget.id) {
      
      let destSheetName = this.getParnetInTree(divTarget, 1).id
      let destDataFile = "";
      if (destSheetName.endsWith('.csv')) {
        destDataFile = destSheetName;
        destSheetName = "";
      } else {
        destDataFile = this.getParnetInTree(divTarget, 2).id
      }

      const data = {
        source: {
          dir: '',  //the dir of the project we're copying from
          dataFile: this.props.dataFile, //The dataFile we're copying from (relative path to dir)
          sheetName: this.props.parentNode?.label, //the sheetName we're copying from
          annotation: this.props.label, //the annotation file we're copying (relative path to dir)
        },
        destination: {
          dir: '',  //the dir of the project we're copying from
          dataFile: destDataFile || "", //The dataFile we're copying from (relative path to dir)
          sheetName: destSheetName, //the sheetName we're copying from
          annotation: divTarget.id, //the annotation file we're copying (relative path to dir)
        }

      }
      this.requestService.copyAnnotation(data);
    }
    this.setState({ position: { x: 0, y: 0 } });
  }

  isAnnotaion(): boolean {
    return this.props.label.endsWith(".annotation");
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
            dataFile={n.dataFile}
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
      <Tooltip id="navbar-tooltip">
        {this.props.label}
      </Tooltip>
    );

    const classNameNodeDiv = this.isAnnotaion() ? "drop-target annotation" : "";

    return (
      <li id={this.props.label}>
        <Draggable axis={this.isAnnotaion() ? "y" : "none"} position={this.state.position}
          onStop={(e: DraggableEvent, data: DraggableData) => this.onStop(e, data)}
          disabled={!this.isAnnotaion()}
        >
          <div className={classNameNodeDiv} id={this.props.label} >
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
