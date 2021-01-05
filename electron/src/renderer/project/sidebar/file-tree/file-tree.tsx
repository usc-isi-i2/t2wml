import React, { Component } from "react";
import wikiStore from "../../../data/store";
import './file-tree.css';
// import { TreeMode } from '@/shared/types'
import RequestService from "@/renderer/common/service";
import { saveFiles } from "../../save-files";
import FileNode, { NodeProps, NodeType } from "./node";
import { IReactionDisposer, reaction } from "mobx";


type TreeProps = {}; // An empty interfaces causes an error
interface TreeState {
  fileTree: NodeProps;
}

const emptyFunc= (node: NodeProps) => void 0
const rootNode = {id: "Root00000123943875",
                  label: "Files",
                  childNodes: [],
                  type: "Label",
                  parentNode: null,
                  rightClick: emptyFunc,
                  onClick: emptyFunc } as NodeProps;


class FileTree extends Component<TreeProps, TreeState> {
  private requestService: RequestService;
  private disposers: IReactionDisposer[] = [];

  constructor(props: TreeProps){
    super(props)
    this.requestService = new RequestService();
    this.state={fileTree: rootNode}
    this.updateFileTree();
  }

  componentDidMount() {
    this.disposers.push(reaction(() => wikiStore.projects.projectDTO, () => this.updateFileTree()));
    this.disposers.push(reaction(() => saveFiles.currentState, () => this.updateFileTree()));
  }

  componentWillUnmount() {
    for (const disposer of this.disposers) {
      disposer();
    }
  }

  async changeDataFile(dataFile: string) {
    saveFiles.changeDataFile(dataFile);
    await this.requestService.getTable();
  }

  async changeSheet(sheetName: string, dataFile: string) {
    saveFiles.changeSheet(sheetName, dataFile);
    await this.requestService.getTable();
  }

  async changeYaml(yaml: string, sheetName: string, dataFile: string) {
    saveFiles.changeYaml(yaml, sheetName, dataFile);
    await this.requestService.getMappingCalculation();
  }

  async changeAnnotation(annotation: string, sheetName: string, dataFile: string) {
    saveFiles.changeAnnotation(annotation, sheetName, dataFile);
    await this.requestService.getMappingCalculation();
  }

    async changeFile(node: NodeProps) {
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

        if (node.label !== saveFiles.currentState.mappingFile) {
            await this.changeYaml(node.label, sheet.label, dataFile);
        }
    } else if (node.type === "Annotation") {
      const sheet = node.parentNode!;
      const dataFile = sheet.parentNode!.label;

      if (node.label !== saveFiles.currentState.mappingFile) {
          await this.changeAnnotation(node.label, sheet.label, dataFile);
      }
    }
  }


  onRightClick(node: NodeProps){
      console.log("right click", node)

  }


  buildSubFileTree(projDict: any, df: string, sheetName: string, type: NodeType, parentNode: NodeProps) {
    if (!projDict[df] || !projDict[df][sheetName]) {
      return;
    }
    for (const filename of projDict[df][sheetName]["val_arr"]) {
      parentNode.childNodes.push(
        {
          id: filename+parentNode.id,
          label: filename,
          childNodes: [] as NodeProps[],
          type: type,
          parentNode: parentNode,
          rightClick: (node: NodeProps) => this.onRightClick(node),
          onClick: (node: NodeProps) => this.changeFile(node),
          //because yaml ends in .yaml and annotation in .json, we can check both simultaneously?
          bolded: saveFiles.currentState.mappingFile == filename
        }
      )
    }
  }

  buildFileTree(): NodeProps {
    const project = wikiStore.projects.projectDTO;
    rootNode.childNodes=[];
    if (!project || !project.data_files) { return rootNode; }
    for (const df of Object.keys(project.data_files).sort()) {
      const dataNode = {
        id: df,
        label: df,
        childNodes: [],
        type: "DataFile",
        parentNode: rootNode,
        rightClick: (node: NodeProps) => this.onRightClick(node),
        onClick: (node: NodeProps) => this.changeFile(node),
        bolded: saveFiles.currentState.dataFile == df
      } as NodeProps;
      const sheet_arr = project.data_files[df].val_arr;
      for (const sheetName of sheet_arr) {
        const sheetNode = {
          id: sheetName+df,
          label: sheetName,
          childNodes: [],
          type: "Sheet",
          parentNode: dataNode,
          rightClick: (node: NodeProps) => this.onRightClick(node),
          onClick: (node: NodeProps) => this.changeFile(node),
          bolded: saveFiles.currentState.sheetName == sheetName
        } as NodeProps;
        this.buildSubFileTree(project.annotations, df, sheetName, "Annotation", sheetNode)
        this.buildSubFileTree(project.yaml_sheet_associations, df, sheetName,  "Yaml", sheetNode)
        dataNode.childNodes.push(sheetNode)
      }
      rootNode.childNodes.push(dataNode)
    }
    return rootNode;
  }

  updateFileTree(){
    const fileTree = this.buildFileTree()
    this.setState({fileTree})
  }

  render() {

    return (
      <ul>
        <FileNode
          id={this.state.fileTree.id}
          label={this.state.fileTree.label}
          childNodes={this.state.fileTree.childNodes}
          type={this.state.fileTree.type}
          parentNode={this.state.fileTree.parentNode}
          rightClick={this.state.fileTree.rightClick}
          onClick={this.state.fileTree.onClick}/>
      </ul>
    )
  }
}

export default FileTree;
