import React, { Component, Fragment } from "react";
import wikiStore from "../../../data/store";
import './file-tree.css';
// import { TreeMode } from '@/shared/types'
import * as path from 'path';
import RequestService from "@/renderer/common/service";
import { currentFilesService } from "../../../common/current-file-service";
import FileNode, { NodeProps, NodeType } from "./node";
import { IReactionDisposer, reaction } from "mobx";
import { remote, shell } from 'electron';
import RenameFile from "@/renderer/project/sidebar/file-tree/rename-file";
import { Spinner } from "react-bootstrap";
import { defaultYamlContent } from "../../default-values";


type TreeProps = {}; // An empty interfaces causes an error
interface TreeState {
  files: NodeProps[];
  showRenameFile: boolean;
  clickedNode: NodeProps | null;
  showSpinner: boolean;
}

function emptyFunc() { /* NO-OP */ }


class FileTree extends Component<TreeProps, TreeState> {
  private requestService: RequestService;
  private disposers: IReactionDisposer[] = [];

  constructor(props: TreeProps) {
    super(props)
    this.requestService = new RequestService();
    this.state = {
      files: [],
      showRenameFile: false,
      clickedNode: null,
      showSpinner: false,
    };
  }

  componentDidMount() {
    this.disposers.push(reaction(() => wikiStore.project.projectDTO, () => this.updateFileTree()));
    this.disposers.push(reaction(() => currentFilesService.currentState, () => this.updateFileTree()));
    this.disposers.push(reaction(() => wikiStore.table.showSpinner, (show) => this.setState({ showSpinner: show })));
    this.updateFileTree();
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
    wikiStore.table.showSpinner = true;
    wikiStore.yaml.showSpinner = true;
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

    wikiStore.table.showSpinner = false;
    wikiStore.yaml.showSpinner = false;
  }

  renameNode() {
    this.setState({ showRenameFile: true });
  }

  openFile() {
    const filePath = this.state.clickedNode!.label;
    const directory = path.join(wikiStore.project.projectDTO!.directory, filePath);
    shell.showItemInFolder(directory);
  }

  async deleteFile(deleteFromFs: boolean) {
    const filename = this.state.clickedNode!.label;
    if (currentFilesService.currentState.dataFile == filename || currentFilesService.currentState.mappingFile == filename) {
      alert("Cannot delete or remove a file that is currently open");
      return;
    }

    this.setState({ showSpinner: true });
    // send request
    const data = { "file_name": filename, "delete": deleteFromFs };
    try {
      await this.requestService.removeOrDeleteFile(wikiStore.project.projectDTO!.directory, data);
    } catch (error) {
      console.log(error);
    } finally {
      this.setState({ showSpinner: false });
    }
  }

  async addYaml() {
    const result = await remote.dialog.showSaveDialog({
      title: "Add Empty Yaml File",
      defaultPath: wikiStore.project.projectDTO!.directory,
      properties: ['createDirectory'],
      filters: [
        { name: "Yaml", extensions: ["yaml"] }
      ],
    });
    if (!result.canceled && result.filePath) {
      try {
        // send request
        const data = {
          "yaml": defaultYamlContent,
          "title": result.filePath,
          "sheetName": this.state.clickedNode!.label,
          "dataFile": this.state.clickedNode!.parentNode!.label
        };

        await this.requestService.saveYaml(data);
      } catch (error) {
        console.log(error);
      }

    }
  }

  async addAnnotation() {
    const result = await remote.dialog.showSaveDialog({
      title: "Add Empty Annotation File",
      defaultPath: wikiStore.project.projectDTO!.directory,
      properties: ['createDirectory'],
      filters: [
        { name: "annotation", extensions: ["annotation", "json"] }
      ],
    });
    if (!result.canceled && result.filePath) {
      try {
        const data = {
          "title":result.filePath,
          "sheetName": this.state.clickedNode!.label,
          "dataFile": this.state.clickedNode!.parentNode!.label
        };

        await this.requestService.createAnnotation(data)
      } catch (error) {
        console.log(error);
      } finally {
        this.setState({ showSpinner: false });
      }
  }
  }

  async addExistingYaml() {
    const result = await remote.dialog.showOpenDialog({
      title: "Open Existing Yaml File",
      defaultPath: wikiStore.project.projectDTO!.directory,
      properties: ['createDirectory'],
      filters: [
        { name: "Yaml", extensions: ["yaml"] }
      ],
    });
    if (!result.canceled && result.filePaths) {
      try {
        // send request
        const data = {
          "title": result.filePaths[0],
          "sheetName": this.state.clickedNode!.label,
          "dataFile": this.state.clickedNode!.parentNode!.label,
          "type":"yaml"
        };

        await this.requestService.addExistingMapping(data);
      } catch (error) {
        console.log(error);
      }

    }
  }

  async addExistingAnnotation() {
    const result = await remote.dialog.showOpenDialog({
      title: "Open Existing Annotation File",
      defaultPath: wikiStore.project.projectDTO!.directory,
      properties: ['createDirectory'],
      filters: [
        { name: "annotation", extensions: ["annotation", "json"] }
      ],
    });
    if (!result.canceled && result.filePaths) {
      try {
        const data = {
          "title":result.filePaths[0],
          "sheetName": this.state.clickedNode!.label,
          "dataFile": this.state.clickedNode!.parentNode!.label,
          "type":"annotation"
        };

        await this.requestService.addExistingMapping(data)
      } catch (error) {
        console.log(error);
      } finally {
        this.setState({ showSpinner: false });
      }
  }
  }



  onRightClick(node: NodeProps) {
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
        menu.append(new MenuItem({ label: 'Remove from project', click: () => this.deleteFile(false) }));
        menu.append(new MenuItem({ label: 'Delete from project and filesystem', click: () => this.deleteFile(true) }));
        break;
      }
      case 'Sheet': {
        menu.append(new MenuItem({ label: 'Add empty annotation file', click: () => this.addAnnotation() }));
        menu.append(new MenuItem({ label: 'Add empty yaml file', click: () => this.addYaml() }));
        menu.append(new MenuItem({ type: 'separator' }));
        menu.append(new MenuItem({ label: 'Load existing annotation file', click: () => this.addExistingAnnotation() }));
        menu.append(new MenuItem({ label: 'Load existing yaml file', click: () => this.addExistingYaml() }));
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
          id: filename + parentNode.id,
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

  buildFileTree(): NodeProps[] {
    const project = wikiStore.project.projectDTO;
    const files = [] as NodeProps[]
    if (!project || !project.data_files) { return files; }
    for (const df of Object.keys(project.data_files).sort()) {
      const dataNode = {
        id: df,
        label: df,
        childNodes: [],
        type: "DataFile",
        parentNode: null,
        rightClick: (node: NodeProps) => this.onRightClick(node),
        onClick: (node: NodeProps) => this.changeFile(node),
        bolded: currentFilesService.currentState.dataFile == df
      } as NodeProps;
      const sheet_arr = project.data_files[df].val_arr;
      for (const sheetName of sheet_arr) {
        const sheetNode = {
          id: sheetName + df,
          label: sheetName,
          childNodes: [],
          type: "Sheet",
          parentNode: dataNode,
          rightClick: (node: NodeProps) => this.onRightClick(node),
          onClick: (node: NodeProps) => this.changeFile(node),
          bolded: currentFilesService.currentState.sheetName == sheetName
        } as NodeProps;
        this.buildSubFileTree(project.annotations, df, sheetName, "Annotation", sheetNode)
        this.buildSubFileTree(project.yaml_sheet_associations, df, sheetName, "Yaml", sheetNode)
        dataNode.childNodes.push(sheetNode)
      }
      files.push(dataNode)
    }
    return files;
  }

  updateFileTree() {
    const files = this.buildFileTree()
    this.setState({ files })
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
          <RenameFile
            showRenameFile={this.state.showRenameFile}
            showSpinner={this.state.showSpinner}
            tempRenameFile={this.state.clickedNode.label}
            type={this.state.clickedNode.type}
            isTempRenameFileValid={true}
            handleRenameFile={(name) => this.handleRenameFile(name)}
            cancelRenameFile={() => this.cancelRenameFile()}
          /> : null}
        {/* loading spinner */}
        <div className="mySpinner truncate" hidden={!this.state.showSpinner}>
          <Spinner animation="border" />
        </div>

        <ul>
          {this.state.files.map((fileNode)=>
          <FileNode
          id={fileNode.id}
          label={fileNode.label}
          childNodes={fileNode.childNodes}
          type={fileNode.type}
          parentNode={fileNode.parentNode}
          rightClick={fileNode.rightClick}
          onClick={fileNode.onClick} />
          )}

        </ul>
      </Fragment>
    )
  }
}

export default FileTree;
