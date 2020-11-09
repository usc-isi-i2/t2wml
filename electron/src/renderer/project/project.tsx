import React, { Component } from 'react';
import './project.css';
import './ag-grid.css'
import './ag-theme-balham.css'
import Navbar from '../common/navbar/navbar';


// App
import SplitPane from 'react-split-pane';
import Pane from '../../../node_modules/react-split-pane';
// import Pane from 'react-split-pane/lib/Pane';
import Config from '@/shared/config';

import { ErrorMessage } from '../common/general';

// components
import Editors from './editor';
import Output from './output/output';
import TableViewer from './table-viewer/table-viewer';
import RequestService from '../common/service';
import ToastMessage from '../common/toast';

import { observer } from "mobx-react";
import wikiStore from '../data/store';
import Settings from './settings';
import { ipcRenderer } from 'electron';
import Sidebar from './sidebar/sidebar';
// import { IReactionDisposer, reaction } from 'mobx';


interface ProjectState {
  showSettings: boolean;
  endpoint: string;
  warnEmpty: boolean;
  name: string;
  errorMessage: ErrorMessage;
  // showTreeFlag: boolean;
}

interface ProjectProps {
  path: string;
}

@observer
class Project extends Component<ProjectProps, ProjectState> {
  private requestService: RequestService;
  // private disposeReaction?: IReactionDisposer;

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
      // showTreeFlag: wikiStore.projects.showFileTree,
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
    ipcRenderer.on('toggle-file-tree', this.onShowFileTreeClicked);

    // this.disposeReaction = reaction(() => wikiStore.projects.showFileTree, (flag) => this.setState({showTreeFlag: flag}));
  }

  componentWillUnmount() {
    console.log("project- componentWillUnmount");
    ipcRenderer.removeListener('refresh-project', this.onRefreshProject);
    ipcRenderer.removeListener('project-settings', this.onShowSettingsClicked);
    ipcRenderer.removeListener('toggle-file-tree', this.onShowFileTreeClicked);

    // if (this.disposeReaction) {
    //   this.disposeReaction();
    // }
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
    try{
      await this.requestService.getProject(this.props
        .path);    
      document.title = 't2wml: ' + wikiStore.projects.projectDTO!.title;
      this.setState({name: wikiStore.projects.projectDTO!.title});

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
      // follow-ups (success)
      wikiStore.table.showSpinner = false;
      wikiStore.wikifier.showSpinner = false;

    } catch(error) {
      console.error("Can't fetch project: ", error);
      error.errorDescription += "\n\nCannot fetch project!";
      this.setState({ errorMessage: error });

      // follow-ups (failure)
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

  onShowFileTreeClicked() {
    wikiStore.projects.showFileTree = !wikiStore.projects.showFileTree;
  }

  async handleSaveSettings() {
    // update settings
    this.setState({ showSettings: false });

    // notify backend
    const formData = new FormData();
    formData.append("endpoint", wikiStore.projects.projectDTO!.sparql_endpoint);
    formData.append("warnEmpty", wikiStore.projects.projectDTO!.warn_for_empty_cells.toString());

    try {
      await this.requestService.getSettings(this.props.path, formData);
    } catch(error) {
      console.error('Error updating settings: ', error);
      error.errorDescription += "\n\nCannot update settings!";
      this.setState({ errorMessage: error });
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
          handleSaveSettings={() => this.handleSaveSettings()}
          cancelSaveSettings={() => this.cancelSaveSettings()} />

        {/* content */}
        <div style={{ height: "calc(100vh - 50px)", background: "#f8f9fa" }}>
          {/* { this.state.showTreeFlag ? */}
          {/* <SplitPane className="p-3" split="vertical" defaultSize="55%" minSize={300} maxSize={-300}>
            <Pane initialSize="0%" minSize="0%" maxSize="0%" className={(wikiStore.projects.showFileTree ? "opened-sidebar" : "closed-sidebar")}>
              <Sidebar />
            </Pane>
            <Pane initialSize="100%" minSize="100%" maxSize="100%" split="vertical" className={(wikiStore.projects.showFileTree ? "table-sidebar-open" : "table-sidebar-close")}>
              <TableViewer />

              <SplitPane className="" split="horizontal" defaultSize="60%" minSize={200} maxSize={-200}>
                <Editors />
                <Output />
              </SplitPane>
            </Pane>
            
          </SplitPane> */}


          <SplitPane className="p-3" split="vertical">
            <Pane defaultSize="0%" minSize="0%" maxSize="10%" className={(wikiStore.projects.showFileTree ? "opened-sidebar" : "closed-sidebar")}>
              <Sidebar />
            </Pane>
            <Pane split="vertical" defaultSize="40%" minSize={100} maxSize={-100}  className={(wikiStore.projects.showFileTree ? "table-sidebar-open" : "table-sidebar-close")}>
              <TableViewer />

              <Pane className="" split="horizontal" defaultSize="60%" minSize={200} maxSize={-200}>
                <Editors />
                <Output />
              </Pane>
            </Pane>
            
          </SplitPane>
        </div>

      </div>
    );
  }
}

export default Project;
