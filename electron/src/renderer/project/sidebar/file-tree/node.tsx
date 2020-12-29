import RequestService from "@/renderer/common/service";
import React, { Component } from "react";
import { saveFiles } from "../../save-files";
import DoubleClick from "./double-click-HOC";

export type NodeType = "DataFile" | "Sheet" | "Label" | "Yaml" | "Annotation" | "Wikifier" | "Entity"

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
    private requestService: RequestService;
  constructor(props: NodeProps) {
    super(props);
    this.requestService = new RequestService();

    this.state = {
      collapsed: false,
    }
  }

  async changeDataFile(dataFile: string) {
    saveFiles.changeDataFile(dataFile);
    await this.requestService.getYamlCalculation();
  }

  async changeSheet(sheetName: string, dataFile: string) {
    saveFiles.changeDataFile(dataFile);
    saveFiles.changeSheet(sheetName);
    await this.requestService.getYamlCalculation();
  }

  async changeYaml(yaml: string, sheetName: string, dataFile: string) {
    saveFiles.changeDataFile(dataFile);
    saveFiles.changeSheet(sheetName);
    saveFiles.changeYaml(yaml);
    await this.requestService.getYamlCalculation();
  }

  onClick() {
    this.setState({ collapsed: !this.state.collapsed });
  }

  async onDoubleClick() {
    if (this.props.type === "DataFile") {
        if (this.props.label !== saveFiles.currentState.dataFile) {
            await this.changeDataFile(this.props.label);
        }
    } else if (this.props.type === "Sheet") { // TODO- check sheet updates
        if (this.props.label !== saveFiles.currentState.sheetName) {
            await this.changeSheet(this.props.label, this.props.parentNode!.label);
        }
    } else if (this.props.type === "Yaml") {
        const sheet = this.props.parentNode!;
        const dataFile = sheet.parentNode!.label;
            
        if (this.props.label !== saveFiles.currentState.yamlFile) {
            await this.changeYaml(this.props.label, sheet.label, dataFile);
        }
    }

  }

  onRightClick(e: React.MouseEvent) {
    console.log("onNodeRightClicked: ", e.currentTarget.innerHTML);
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
      </li>
    )
  }
}

export default FileNode;
