import React, { Component } from "react";
import wikiStore from "../../../data/store";
import './file-tree.css';
// import { TreeMode } from '@/shared/types'
import RequestService from "@/renderer/common/service";
import { saveFiles } from "../../save-files";
import FileNode, { NodeProps, NodeType } from "./node";


interface TreeProps {
}

interface TreeState {

}

const emptyFunc= (node: NodeProps) => void 0


class FileTree extends Component<TreeProps, TreeState> {
  private requestService: RequestService;

  constructor(props: TreeProps){
    super(props)
    this.requestService = new RequestService();

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

    async onDoubleClick(node: NodeProps) {
    if (node.type === "DataFile") {
        if (node.label !== saveFiles.currentState.dataFile) {
            await this.changeDataFile(node.label);
        }
    } else if (node.type === "Sheet") { // TODO- check sheet updates
        if (node.label !== saveFiles.currentState.sheetName) {
            await this.changeSheet(node.label, node.parentNode!.label);
        }
    } else if (node.type === "Yaml") {
        const sheet = node.parentNode!;
        const dataFile = sheet.parentNode!.label;

        if (node.label !== saveFiles.currentState.yamlFile) {
            await this.changeYaml(node.label, sheet.label, dataFile);
        }
    }
  }


  onRightClick(node: NodeProps){
      console.log("right click", node)

  }


  getSubFileTree(projDict: any, df: string, sheetName: string, label: string, type: NodeType, parentNode: NodeProps) {
    if (!projDict[df] || !projDict[df][sheetName]) {
      return;
    }
    for (const filename of projDict[df][sheetName]["val_arr"]) {
      parentNode.childNodes.push(
        {
          label: filename,
          childNodes: [] as NodeProps[],
          type: type,
          parentNode: parentNode,
          rightClick: (node: NodeProps) => this.onRightClick(node),
          doubleClick: (node: NodeProps) => this.onDoubleClick(node)
        }
      )
    }
  }

  getFileTree(): NodeProps {
    const rootNode = { label: "Files",
                      childNodes: [],
                      type: "Label",
                      parentNode: null,
                      rightClick: emptyFunc,
                      doubleClick: emptyFunc } as NodeProps;
    const project = wikiStore.projects.projectDTO;
    if (!project || !project.data_files) { return rootNode; }
    for (const df of Object.keys(project.data_files).sort()) {
      const dataNode = {
        label: df,
        childNodes: [],
        type: "DataFile",
        parentNode: rootNode,
        rightClick: (node: NodeProps) => this.onRightClick(node),
        doubleClick: (node: NodeProps) => this.onDoubleClick(node)
      } as NodeProps;
      const sheet_arr = project.data_files[df].val_arr;
      for (const sheetName of sheet_arr) {
        const sheetNode = {
          label: sheetName,
          childNodes: [],
          type: "Sheet",
          parentNode: dataNode,
          rightClick: (node: NodeProps) => this.onRightClick(node),
          doubleClick: (node: NodeProps) => this.onDoubleClick(node)
        } as NodeProps;
        this.getSubFileTree(project.yaml_sheet_associations, df, sheetName, "Yaml files", "Yaml", sheetNode)
        this.getSubFileTree(project.annotations, df, sheetName, "Annotation files", "Annotation", sheetNode)
        dataNode.childNodes.push(sheetNode)
      }
      rootNode.childNodes.push(dataNode)
    }
    return rootNode;
  }

  render() {
    const fileTree = this.getFileTree()
    return (
      <ul>
        <FileNode label={fileTree.label}
          childNodes={fileTree.childNodes}
          type={fileTree.type}
          parentNode={fileTree.parentNode}
          rightClick={fileTree.rightClick}
          doubleClick={fileTree.doubleClick}/>
      </ul>
    )
  }
}

export default FileTree;
