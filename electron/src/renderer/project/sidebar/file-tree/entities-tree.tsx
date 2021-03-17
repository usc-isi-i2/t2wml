import React, { Component, Fragment } from "react";
import wikiStore from "../../../data/store";
import './file-tree.css';
import * as path from 'path';
import RequestService from "@/renderer/common/service";
import { currentFilesService } from "../../../common/current-file-service";
import FileNode, { NodeProps } from "./node";
import { IReactionDisposer, reaction } from "mobx";
import { remote, shell } from 'electron';
import { Spinner } from "react-bootstrap";


type TreeProps = {}; // An empty interfaces causes an error
interface TreeState {
  files: NodeProps[];
  clickedNode: NodeProps | null;
  showSpinner: boolean;
}

function emptyFunc() { /* NO-OP */ }
const entitiesNode = {
  id: "Root000001",
  label: "Entities",
  childNodes: [],
  type: "Label",
  parentNode: null,
  rightClick: emptyFunc,
  onClick: emptyFunc
} as NodeProps;
const wikifiersNode = {
  id: "Root000002",
  label: "Wikifiers",
  childNodes: [],
  type: "Label",
  parentNode: null,
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
      files: [entitiesNode, wikifiersNode],
      clickedNode: null,
      showSpinner: false,
    };
  }

  componentDidMount() {
    this.disposers.push(reaction(() => wikiStore.project.projectDTO, () => this.updateFileTree()));
    // this.disposers.push(reaction(() => wikiStore.table.showSpinner, (show) => this.setState({ showSpinner: show })));
    this.updateFileTree();
  }

  componentWillUnmount() {
    for (const disposer of this.disposers) {
      disposer();
    }
  }

  async changeFile() {
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
      await this.requestService.getTable();
    } catch (error) {
      console.log(error);
    } finally {
      this.setState({ showSpinner: false });
    }
  }


  async addFile(fileType: string) { // this function?
    let title = "Open Existing Wikifier File"
    let filters = [{ name: "wikifier", extensions: ["csv"] }]
    if (fileType == "Entities") {
      title = "Open Existing Entities File";
      filters = [{ name: "entities (kgtk)", extensions: ["tsv"] }]
    }

    const result = await remote.dialog.showOpenDialog({
      title: title,
      defaultPath: wikiStore.project.projectDTO!.directory,
      properties: ['createDirectory'],
      filters: filters,
    });
    if (!result.canceled && result.filePaths) {
      try {
        const data = { "filepath": result.filePaths[0] };
        if (fileType == "Wikifiers") {
          await this.requestService.uploadWikifierOutput(data);
        }
        else {
          await this.requestService.uploadEntities(data);
        }
        await this.requestService.getTable();

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

    if (node.label == "Wikifiers" || node.label == "Entities") {
      menu.append(new MenuItem({ label: 'Load existing file', click: () => this.addFile(node.label) }));
    } else {
      menu.append(new MenuItem({ label: 'Open in filesystem', click: () => this.openFile() }));
      menu.append(new MenuItem({ type: 'separator' }));
      menu.append(new MenuItem({ label: 'Remove from project', click: () => this.deleteFile(false) }));
      menu.append(new MenuItem({ label: 'Delete from filesystem and project', click: () => this.deleteFile() }));
    }


    menu.popup({ window: remote.getCurrentWindow() });
  }

  buildFileTree(): NodeProps[] {
    const project = wikiStore.project.projectDTO;
    entitiesNode.childNodes = [];
    entitiesNode.rightClick = (node: NodeProps) => this.onRightClick(entitiesNode)
    wikifiersNode.childNodes = [];
    wikifiersNode.rightClick = (node: NodeProps) => this.onRightClick(wikifiersNode)

    if (!project || (!project.entity_files && !project.wikifier_files)) { return []; }
    for (const ef of project.entity_files) {
      const entityNode = {
        id: ef,
        label: ef,
        childNodes: [],
        type: "Entity",
        parentNode: entitiesNode,
        rightClick: (node: NodeProps) => this.onRightClick(node),
        onClick: () => this.changeFile(),
        bolded: currentFilesService.currentState.dataFile == ef // TODO: add entity file to state ?
      } as NodeProps;
      entitiesNode.childNodes.push(entityNode);
    }

    for (const wf of project.wikifier_files) {
      const wikifierNode = {
        id: wf,
        label: wf,
        childNodes: [],
        type: "Wikifier",
        parentNode: wikifiersNode,
        rightClick: (node: NodeProps) => this.onRightClick(node),
        onClick: () => this.changeFile(),
        bolded: currentFilesService.currentState.dataFile == wf // TODO: add wikifier file to state ?
      } as NodeProps;
      wikifiersNode.childNodes.push(wikifierNode);
    }
    return [entitiesNode, wikifiersNode];
  }

  updateFileTree() {
    const files = this.buildFileTree()
    this.setState({ files });
  }

  render() {
    return (
      <Fragment>
        {/* loading spinner */}
        <div className="mySpinner" hidden={!this.state.showSpinner}>
          <Spinner animation="border" />
        </div>

        <ul style={{ width: "100%" }}>
          {this.state.files.map((fileNode, index) => (
            <FileNode key={index}
              id={fileNode.id}
              label={fileNode.label}
              childNodes={fileNode.childNodes}
              type={fileNode.type}
              parentNode={fileNode.parentNode}
              rightClick={fileNode.rightClick}
              onClick={fileNode.onClick} />
          ))}

        </ul>
      </Fragment>
    )
  }
}

export default EntitiesTree;
