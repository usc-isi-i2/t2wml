import React, { Component } from 'react';
import './project.css';
import './ag-grid.css'
import './ag-theme-balham.css'
import Navbar from '../common/navbar/navbar';


// App
import SplitPane from 'react-split-pane';
import Config from '@/shared/config';

import { ErrorMessage } from '../common/general';

// components
import Editors from './editor';
import Output from './output/output';
import TableViewer from './table-viewer/table-viewer';
import RequestService, { IStateWithError } from '../common/service';
import ToastMessage from '../common/toast';

import { observer } from "mobx-react";
import wikiStore from '../data/store';
import Settings from './settings';
import { ipcRenderer } from 'electron';
import { IpcRendererEvent } from 'electron/renderer';
import Sidebar from './sidebar/sidebar';
import { IReactionDisposer, reaction } from 'mobx';


interface ProjectState extends IStateWithError {
  showSettings: boolean;
  endpoint: string;
  warnEmpty: boolean;
  name: string;
  showTreeFlag: boolean;
}

interface ProjectProps {
  path: string;
}

@observer
class Project extends Component<ProjectProps, ProjectState> {
  private requestService: RequestService;
  private disposeReaction?: IReactionDisposer;

  constructor(props: ProjectProps) {
    super(props);
    this.requestService = new RequestService();

    // init global variables
    wikiStore.table.isCellSelectable = false;
    if (wikiStore.projects.projectDTO) {
      wikiStore.projects.projectDTO!.sparql_endpoint = Config.defaultSparqlEndpoint;
    }
    // init state
    this.state = {

      // appearance
      showSettings: false,
      endpoint: '',
      warnEmpty: false,
      name: '',

      errorMessage: {} as ErrorMessage,
      showTreeFlag: wikiStore.projects.showFileTree,
    };

    // Bind the handlers that are tied to ipcRenderer and needs to be removed
    this.onRefreshProject = this.onRefreshProject.bind(this);
    this.onShowSettingsClicked = this.onShowSettingsClicked.bind(this);
    this.onShowFileTreeClicked = this.onShowFileTreeClicked.bind(this);
  }

  componentDidMount() {
    console.log("project- componentDidMount");
    if (this.props.path) {
      this.loadProject();
    } else {
      console.error("There is no project id.")
    }
    ipcRenderer.on('refresh-project', this.onRefreshProject);
    ipcRenderer.on('project-settings', this.onShowSettingsClicked);
    ipcRenderer.on('toggle-file-tree', (sender: IpcRendererEvent, checked: boolean) => {
      this.onShowFileTreeClicked(checked);
    });

    this.disposeReaction = reaction(() => wikiStore.projects.showFileTree, (flag) => this.setState({showTreeFlag: flag}));
  }

  componentWillUnmount() {
    console.log("project- componentWillUnmount");
    ipcRenderer.removeListener('refresh-project', this.onRefreshProject);
    ipcRenderer.removeListener('project-settings', this.onShowSettingsClicked);
    ipcRenderer.removeListener('toggle-file-tree', this.onShowFileTreeClicked);

    if (this.disposeReaction) {
      this.disposeReaction();
    }
  }

  componentDidUpdate(prevProps: ProjectProps) {
    if (this.props.path !== prevProps.path) {
      this.loadProject();
    }
  }

  async loadProject() {
    // before fetching project files
    wikiStore.table.showSpinner = true;
    wikiStore.wikifier.showSpinner = true;
    wikiStore.output.isDownloadDisabled = true;

    // fetch project files
    console.debug('Refreshing project ', this.props.path);
    try {
      await this.requestService.call(this, () => this.requestService.getProject(this.props.path));
      document.title = 't2wml: ' + wikiStore.projects.projectDTO!.title;
      this.setState({ name: wikiStore.projects.projectDTO!.title });

      if (wikiStore.yaml.yamlContent !== null) {
        wikiStore.table.isCellSelectable = true;
        wikiStore.output.isDownloadDisabled = false;
      } else {
        wikiStore.table.isCellSelectable = false;
      }

      // load settings
      if (!wikiStore.projects.projectDTO!.sparql_endpoint) {
        wikiStore.projects.projectDTO!.sparql_endpoint = Config.defaultSparqlEndpoint;
      }

    } catch {

    } finally {
      wikiStore.table.showSpinner = false;
      wikiStore.wikifier.showSpinner = false;
    }

  }

  onRefreshProject() {
    this.loadProject();
  }

  async onShowSettingsClicked() {
    this.setState({
      endpoint: wikiStore.projects.projectDTO?.sparql_endpoint || "",
      warnEmpty: wikiStore.projects.projectDTO?.warn_for_empty_cells || false,
      showSettings: true
    });
  }

  onShowFileTreeClicked(checked: boolean) {
    wikiStore.projects.showFileTree = checked;
  }

  async handleSaveSettings(endpoint: string, warn: boolean) {
    // update settings
    this.setState({ showSettings: false });

    // notify backend
    const formData = new FormData();
    formData.append("endpoint", endpoint);
    formData.append("warnEmpty", warn.toString());

    try {
      await this.requestService.call(this, () => this.requestService.getSettings(this.props.path, formData));
    } catch {
    }
  }

  cancelSaveSettings() {
    this.setState({ showSettings: false });
  }


  render() {
    return (
      <div>
        <Navbar
          name={this.state.name}
          showSettings={true}
          onShowSettingsClicked={() => this.onShowSettingsClicked()} />

        {this.state.errorMessage.errorDescription ? <ToastMessage message={this.state.errorMessage} /> : null}

        <Settings showSettings={this.state.showSettings}
          endpoint={this.state.endpoint}
          warnEmpty={this.state.warnEmpty}
          handleSaveSettings={(endpoint, warn) => this.handleSaveSettings(endpoint, warn)}
          cancelSaveSettings={() => this.cancelSaveSettings()} />

        {/* content */}
        <div style={{ height: "calc(100vh - 50px)", background: "#f8f9fa" }}>
          <div>
            <Sidebar />
          </div>

          <SplitPane className={this.state.showTreeFlag ? "table-sidebar-open" : "table-sidebar-close" + " p-3"} split="vertical" defaultSize="55%" minSize={300} maxSize={-300} 
            style={{ height: "calc(100vh - 50px)", background: "#f8f9fa" }}>
            <TableViewer />
            <SplitPane className="" split="horizontal" defaultSize="60%" minSize={200} maxSize={-200}>
              <Editors />
              <Output />
            </SplitPane>
          </SplitPane>
        </div>
      </div>
    );
  }
}

export default Project;
