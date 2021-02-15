import React, { Component, Fragment } from "react";
import wikiStore from "../../../data/store";
import './file-tree.css';
import * as path from 'path';
import RequestService from "@/renderer/common/service";
import { currentFilesService } from "../../../common/current-file-service";
import FileNode, { NodeProps, NodeType } from "./node";
import { IReactionDisposer, reaction } from "mobx";
import { remote, shell } from 'electron';
import { Spinner } from "react-bootstrap";


type TreeProps = {}; // An empty interfaces causes an error
interface TreeState {
  fileTree: NodeProps;
  clickedNode: NodeProps | null;
  showSpinner: boolean;
}

function emptyFunc() { /* NO-OP */ }
const rootNode = {
  id: "Root00000123943875",
  label: "Files",
  childNodes: [],
  type: "Label",
  parentNode: null,
  rightClick: emptyFunc,
  onClick: emptyFunc
} as NodeProps;
const entitiesNode = {
  id: "Root000001",
  label: "Entities",
  childNodes: [],
  type: "Label",
  parentNode: rootNode,
  rightClick: emptyFunc,
  onClick: emptyFunc
} as NodeProps;
const wikifiersNode = {
  id: "Root000002",
  label: "Wikifiers",
  childNodes: [],
  type: "Label",
  parentNode: rootNode,
  rightClick: emptyFunc,
  onClick: emptyFunc
} as NodeProps;


class EntitiesTree extends Component<TreeProps, TreeState> {
  private requestService: RequestService;
  private disposers: IReactionDisposer[] = [];

  constructor(props: TreeProps) {
    super(props)
    this.requestService = new RequestService();
    this.state = {
      fileTree: rootNode,
      clickedNode: null,
      showSpinner: false,
    };
  }

  componentDidMount() {
    this.disposers.push(reaction(() => wikiStore.project.projectDTO, () => this.updateFileTree()));
    this.disposers.push(reaction(() => currentFilesService.currentState, () => this.updateFileTree()));
    // this.disposers.push(reaction(() => wikiStore.table.showSpinner, (show) => this.setState({ showSpinner: show })));
    this.updateFileTree();
  }

  componentWillUnmount() {
    for (const disposer of this.disposers) {
      disposer();
    }
  }

  async changeFile(node: NodeProps) {
    wikiStore.table.showSpinner = true;
    wikiStore.yaml.showSpinner = true;
    await wikiStore.yaml.saveYaml();

    // TODO -- change code here

    wikiStore.table.showSpinner = false;
    wikiStore.yaml.showSpinner = false;
  }

  openFile() {
    const filePath = this.state.clickedNode!.label;
    const directory = path.join(wikiStore.project.projectDTO!.directory, filePath);
    shell.showItemInFolder(directory);
  }

  async deleteFile(deleteFromFs = true) { // this function?
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

  removeFile() { // TODO
    console.log("remove file");
  }

  onRightClick(node: NodeProps) {
    this.setState({ clickedNode: node });
    const { Menu, MenuItem } = remote;

    const menu = new Menu();

    menu.append(new MenuItem({ label: 'Open in filesystem', click: () => this.openFile() }));
    menu.append(new MenuItem({ type: 'separator' }));
    menu.append(new MenuItem({ label: 'Remove from project', click: () => this.removeFile() }));
    menu.append(new MenuItem({ label: 'delete from filesystem and project', click: () => this.deleteFile() }));
    
    menu.popup({ window: remote.getCurrentWindow() });
  }

  buildFileTree(): NodeProps {
    const project = wikiStore.project.projectDTO;
    entitiesNode.childNodes = [];
    wikifiersNode.childNodes = [];
    rootNode.childNodes = [entitiesNode, wikifiersNode];

    if (!project || (!project.entity_files && !project.wikifier_files)) { return rootNode; }
    for (const ef of project.entity_files.sort()) {
      const entityNode = {
        id: ef,
        label: ef,
        childNodes: [],
        type: "Entity",
        parentNode: entitiesNode,
        rightClick: (node: NodeProps) => this.onRightClick(node),
        onClick: (node: NodeProps) => this.changeFile(node),
        bolded: currentFilesService.currentState.dataFile == ef // TODO: add entity file to state ?
      } as NodeProps;
      entitiesNode.childNodes.push(entityNode);
    }

    for (const wf of project.wikifier_files.sort()) {
      const wikifierNode = {
        id: wf,
        label: wf,
        childNodes: [],
        type: "Wikifier",
        parentNode: wikifiersNode,
        rightClick: (node: NodeProps) => this.onRightClick(node),
        onClick: (node: NodeProps) => this.changeFile(node),
        bolded: currentFilesService.currentState.dataFile == wf // TODO: add wikifier file to state ?
      } as NodeProps;
      wikifiersNode.childNodes.push(wikifierNode);
    }
    return rootNode;
  }

  updateFileTree() {
    const fileTree = this.buildFileTree()
    this.setState({ fileTree });
  }
  
  render() {
    return (
      <Fragment>
        {/* loading spinner */}
        <div className="mySpinner" hidden={!this.state.showSpinner}>
          <Spinner animation="border" />
        </div>

        <ul>
          <FileNode
            id={this.state.fileTree.id}
            label={this.state.fileTree.label}
            childNodes={this.state.fileTree.childNodes}
            type={this.state.fileTree.type}
            parentNode={this.state.fileTree.parentNode}
            rightClick={this.state.fileTree.rightClick}
            onClick={this.state.fileTree.onClick} />
        </ul>
      </Fragment>
    )
  }
}

export default EntitiesTree;
