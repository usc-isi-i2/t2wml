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
  clickedNode?: NodeProps;
  showSpinner: boolean;
}


class FileTree extends Component<TreeProps, TreeState> {
  private requestService: RequestService;
  private disposers: IReactionDisposer[] = [];

  constructor(props: TreeProps) {
    super(props)
    this.requestService = new RequestService();
    this.state = {
      files: [],
      showRenameFile: false,
      clickedNode: undefined,
      showSpinner: false,
    };
  }

  componentDidMount() {
    this.disposers.push(reaction(() => wikiStore.project.projectDTO, () => this.updateFileTree()));
    //until we figure out why reactions to currentState aren't working, just subscribing inidivually
    this.disposers.push(reaction(() => currentFilesService.currentState, () => this.updateFileTree()));
    this.disposers.push(reaction(() => currentFilesService.currentState.dataFile, () => this.updateFileTree()));
    this.disposers.push(reaction(() => currentFilesService.currentState.sheetName, () => this.updateFileTree()));
    this.disposers.push(reaction(() => currentFilesService.currentState.mappingFile, () => this.updateFileTree()));
    this.disposers.push(reaction(() => wikiStore.table.showSpinner, (show) => this.setState({ showSpinner: show })));
    this.updateFileTree();
  }

  componentWillUnmount() {
    for (const disposer of this.disposers) {
      disposer();
    }
  }

  async callGetTable(){
    wikiStore.table.showSpinner = true;
    wikiStore.yaml.showSpinner = true;
    try{
      await this.requestService.getTable();
    }finally{
      wikiStore.table.showSpinner = false;
      wikiStore.yaml.showSpinner = false;
    }
    wikiStore.wikifier.showSpinner = true;
    try{
      await this.requestService.getPartialCsv();
    }
    finally{
      wikiStore.wikifier.showSpinner = false;
    }
  }

  async changeDataFile(dataFile: string) {
    currentFilesService.changeDataFile(dataFile);
    await this.callGetTable()
  }

  async changeSheet(sheetName: string, dataFile: string) {
    currentFilesService.changeSheet(sheetName, dataFile);
    await this.callGetTable()
  }

  async changeYaml(yaml: string, sheetName: string, dataFile: string) {
    currentFilesService.changeYaml(yaml, sheetName, dataFile);
    await this.callGetTable()
  }

  async changeAnnotation(annotation: string, sheetName: string, dataFile: string) {
    currentFilesService.changeAnnotation(annotation, sheetName, dataFile);
    await this.callGetTable()
  }

  async changeFile(node: NodeProps) {
    wikiStore.table.showSpinner = true;
    wikiStore.yaml.showSpinner = true;
    await wikiStore.yaml.saveYaml();

    if (node.type === "DataFile" || node.type == "SingleSheetDataFile") {
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
    let filename = this.state.clickedNode!.label;

    if (currentFilesService.currentState.mappingFile == filename &&
      currentFilesService.getAnnotationsLength()<2){
      alert("Cannot remove only annotation on sheet while in annotation mode. Clearing annotation instead.")
      const sheetName = this.state.clickedNode!.parentNode!.label;
      const dataFile=this.state.clickedNode!.parentNode!.parentNode!.label;
      const createData = {
        "title": filename,
        "sheetName": sheetName,
        "dataFile": dataFile,
      };
      filename = await this.requestService.createAnnotation(createData)
      this.changeAnnotation(filename, sheetName, dataFile)
      return;
    }


    let updateTree = false;
    if (currentFilesService.currentState.dataFile == filename || currentFilesService.currentState.mappingFile == filename) {
      updateTree=true;
    }


    this.setState({ showSpinner: true });
    // send request
    const data = { "file_name": filename, "delete": deleteFromFs };
    try {
      await this.requestService.removeOrDeleteFile(wikiStore.project.projectDTO!.directory, data);
      if (updateTree){
        if (currentFilesService.currentState.dataFile == filename){
          currentFilesService.getDefaultFiles(wikiStore.project.projectDTO!);
        } else{ //mapping file
          currentFilesService.setMappingFiles();
        }
         //do we need this in order to be able to call get table?
        await this.callGetTable()
      }
    } catch (error) {
      console.log(error);
    } finally {
      this.setState({ showSpinner: false });
    }
  }

  async addYaml(clickedNode: NodeProps) {
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
          "sheetName": clickedNode!.label,
          "dataFile": clickedNode!.parentNode!.label
        };

        const filename = await this.requestService.saveYaml(data);
        this.changeYaml(filename, clickedNode!.label, clickedNode!.parentNode!.label)
      } catch (error) {
        console.log(error);
      }

    }
  }

  async addAnnotation(clickedNode: NodeProps) {
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
          "sheetName": clickedNode!.label,
          "dataFile": clickedNode!.parentNode!.label
        };

        const filename = await this.requestService.createAnnotation(data)
        this.changeAnnotation(filename, clickedNode!.label, clickedNode!.parentNode!.label)
      } catch (error) {
        console.log(error);
      } finally {
        this.setState({ showSpinner: false });
      }
  }
  }

  async addExistingYaml(clickedNode: NodeProps) {
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
          "sheetName": clickedNode!.label,
          "dataFile": clickedNode!.parentNode!.label,
          "type":"yaml"
        };

        const filename = await this.requestService.addExistingMapping(data);
        this.changeYaml(filename, clickedNode!.label, clickedNode!.parentNode!.label)

      } catch (error) {
        console.log(error);
      }

    }
  }

  async addExistingAnnotation(clickedNode: NodeProps) {
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
          "sheetName": clickedNode!.label,
          "dataFile": clickedNode!.parentNode!.label,
          "type":"annotation"
        };

        const filename = await this.requestService.addExistingMapping(data)
        this.changeAnnotation(filename, clickedNode!.label, clickedNode!.parentNode!.label)

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
        menu.append(new MenuItem({ label: 'Rename', click: () => this.renameNode() }));
        menu.append(new MenuItem({ label: 'Remove from project', click: () => this.deleteFile(false) }));
        menu.append(new MenuItem({ label: 'Delete from project and filesystem', click: () => this.deleteFile(true) }));
        break;
      }
      case 'Sheet': {
        menu.append(new MenuItem({ label: 'Add empty annotation file', click: () => this.addAnnotation(node) }));
        menu.append(new MenuItem({ label: 'Add empty yaml file', click: () => this.addYaml(node) }));
        menu.append(new MenuItem({ label: 'Load existing annotation file', click: () => this.addExistingAnnotation(node) }));
        menu.append(new MenuItem({ label: 'Load existing yaml file', click: () => this.addExistingYaml(node) }));
        break;
      }
    case 'SingleSheetDataFile': {
      const sheetNode = node.childNodes[0]
      menu.append(new MenuItem({ label: 'Open in filesystem', click: () => this.openFile() }));
      menu.append(new MenuItem({ label: 'Rename', click: () => this.renameNode() }));
      menu.append(new MenuItem({ label: 'Remove from project', click: () => this.deleteFile(false) }));
      menu.append(new MenuItem({ label: 'Delete from project and filesystem', click: () => this.deleteFile(true) }));
      menu.append(new MenuItem({ type: 'separator' }));
      menu.append(new MenuItem({ label: 'Add empty annotation file', click: () => this.addAnnotation(sheetNode) }));
      menu.append(new MenuItem({ label: 'Add empty yaml file', click: () => this.addYaml(sheetNode) }));
      menu.append(new MenuItem({ label: 'Load existing annotation file', click: () => this.addExistingAnnotation(sheetNode) }));
      menu.append(new MenuItem({ label: 'Load existing yaml file', click: () => this.addExistingYaml(sheetNode) }));
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
      const sheet_arr = project.data_files[df].val_arr;
      let data_type= "DataFile"
      if (sheet_arr.length<2){
        dataType="SingleSheetDataFile"
      }
      const dataNode = {
        id: df,
        label: df,
        childNodes: [],
        type: dataType,
        parentNode: undefined,
        rightClick: (node: NodeProps) => this.onRightClick(node),
        onClick: (node: NodeProps) => this.changeFile(node),
        bolded: currentFilesService.currentState.dataFile == df
      } as NodeProps;

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

        <ul className="filetree">
          {this.state.files.map((fileNode, index) => (
            <FileNode key={index}
              id={fileNode.id}
              label={fileNode.label}
              childNodes={fileNode.childNodes}
              type={fileNode.type}
              parentNode={fileNode.parentNode}
              rightClick={fileNode.rightClick}
              bolded={fileNode.bolded}
              onClick={fileNode.onClick} />
          ))}

        </ul>
      </Fragment>
    )
  }
}

export default FileTree;
