import React, { Component, Fragment } from "react";
import wikiStore from "../../../data/store";
import './file-tree.css';
// import { TreeMode } from '@/shared/types'
import RequestService from "@/renderer/common/service";
import { currentFilesService } from "../../../common/current-file-service";
import FileNode, { NodeProps, NodeType } from "./node";
import { IReactionDisposer, reaction } from "mobx";
import { remote, dialog } from 'electron';
import RenameProject from "@/renderer/project-list/rename-project";



type TreeProps = {}; // An empty interfaces causes an error
interface TreeState {
  fileTree: NodeProps;
  showRenameFile: boolean;
  clickedNode: NodeProps | null;
  showSpinner: boolean;
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
    this.state = {
      fileTree: rootNode,
      showRenameFile: false,
      clickedNode: null,
      showSpinner: false,
    };
    this.updateFileTree();
  }

  componentDidMount() {
    this.disposers.push(reaction(() => wikiStore.project.projectDTO, () => this.updateFileTree()));
    this.disposers.push(reaction(() => currentFilesService.currentState, () => this.updateFileTree()));
  }

  componentWillUnmount() {
    for (const disposer of this.disposers) {
      disposer();
    }
  }

  async changeDataFile(dataFile: string) {
    currentFilesService.changeDataFile(dataFile);
    await this.requestService.getTable();
  }

  async changeSheet(sheetName: string, dataFile: string) {
    currentFilesService.changeSheet(sheetName, dataFile);
    await this.requestService.getTable();
  }

  async changeYaml(yaml: string, sheetName: string, dataFile: string) {
    currentFilesService.changeYaml(yaml, sheetName, dataFile);
    await this.requestService.getTable();
    // await this.requestService.getMappingCalculation();
  }

  async changeAnnotation(annotation: string, sheetName: string, dataFile: string) {
    currentFilesService.changeAnnotation(annotation, sheetName, dataFile);
    await this.requestService.getTable();
    // await this.requestService.getMappingCalculation();
  }

  async changeFile(node: NodeProps) {
    await wikiStore.yaml.saveYaml();
    if (node.type === "DataFile") {
        if (node.label !== currentFilesService.currentState.dataFile) {
            await this.changeDataFile(node.label);
        }
    } else if (node.type === "Sheet") {
        if (node.label !== currentFilesService.currentState.sheetName) {
            await this.changeSheet(node.label, node.parentNode!.label);
        }
    } else if (node.type === "Yaml") {
        const sheet = node.parentNode!;
        const dataFile = sheet.parentNode!.label;

        if (node.label !== currentFilesService.currentState.mappingFile) {
            await this.changeYaml(node.label, sheet.label, dataFile);
        }
    } else if (node.type === "Annotation") {
      const sheet = node.parentNode!;
      const dataFile = sheet.parentNode!.label;

      if (node.label !== currentFilesService.currentState.mappingFile) {
          await this.changeAnnotation(node.label, sheet.label, dataFile);
      }
    }
  }

  renameNode() {
    this.setState({ showRenameFile: true });
  }

  openFile() {
    // dialog.showOpenDialog((fileName: string) => {
    //   if (!fs.existSync(this.state.clickedNode!.label)) {
    //     alert("This file does not exist");
    //     return;
    //   }
    //   alert("Opened!!")
    // })
  }

  deleteFile() {

  }

  onRightClick(node: NodeProps){
    this.setState({ clickedNode: node });
    const { Menu, MenuItem } = remote;

    const menu = new Menu();


    switch (node.type) {
      case 'DataFile':
      case 'Yaml':
      case 'Annotation': {
        menu.append(new MenuItem({ label: 'Open in filesystem', click: () => this.openFile() }));
        menu.append(new MenuItem({ type: 'separator' }));
        menu.append(new MenuItem({ label: 'Rename', click: () => this.renameNode() }));
        menu.append(new MenuItem({ label: 'Remove from project', click: () => this.renameNode() }));
        menu.append(new MenuItem({ label: 'Delete from project and filesystem', click: () => this.deleteFile() }));
        break;
      }
      case 'Sheet': {
        menu.append(new MenuItem({ label: 'Add annotation file', click: () => this.renameNode() }));
        menu.append(new MenuItem({ label: 'Add yaml file', click: () => this.renameNode() }));
        break;
      }
      default: {
        menu.append(new MenuItem({ type: 'separator' }));
      }
    }

    menu.popup({ window: remote.getCurrentWindow() });
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
          bolded: currentFilesService.currentState.mappingFile == filename
        }
      )
    }
  }

  buildFileTree(): NodeProps {
    const project = wikiStore.project.projectDTO;
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
        bolded: currentFilesService.currentState.dataFile == df
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
          bolded: currentFilesService.currentState.sheetName == sheetName
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

  async handleRenameFile(name: string) {
    const tmpName = name.trim();
    if (tmpName === "") {
      this.cancelRenameFile();
      return;
    }

    // before sending request
    this.setState({ showSpinner: true });

    // send request
    const data = { "old_name": this.state.clickedNode!.label, new_name: tmpName };
    try {
      await this.requestService.renameFile(wikiStore.project.projectDTO!.directory, data);
    } catch (error) {
      console.log(error);
    } finally {
      this.setState({ showRenameFile: false, showSpinner: false });
    }
  }

  cancelRenameFile() {
    this.setState({ showRenameFile: false });
  }

  render() {

    return (
      <Fragment>
        {this.state.clickedNode ?
          <RenameProject
            showRenameProject={this.state.showRenameFile}
            showSpinner={this.state.showSpinner}
            tempRenameProject={this.state.clickedNode.label}
            type={this.state.clickedNode.type}
            isTempRenameProjectVaild={true}
            handleRenameProject={(name) => this.handleRenameFile(name)}
            cancelRenameProject={() => this.cancelRenameFile()}
          /> : null }
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
      </Fragment>
    )
  }
}

export default FileTree;
