import React, { Component } from 'react';
import './project.css';
import './ag-grid.css'
import './ag-theme-balham.css'
import Navbar from '../common/navbar/navbar';


// App
import SplitPane from 'react-split-pane';
import Config from '@/shared/config';

import { ErrorMessage, t2wmlColors } from '../common/general';

// components
import Editors from './editor';
import Output from './output/output';
import TableComponent from './table-component/table-component';
import RequestService, { IStateWithError } from '../common/service';
import ToastMessage from '../common/toast';

import { observer } from "mobx-react";
import wikiStore from '../data/store';
import Settings from './settings';
import { ipcRenderer } from 'electron';
import { IpcRendererEvent } from 'electron/renderer';
import Sidebar from './sidebar/sidebar';
import { TableDTO } from '../common/dtos';
import { IReactionDisposer, reaction } from 'mobx';
import TableContainer from './table/table-container';


interface ProjectState extends IStateWithError {
  showSettings: boolean;
  endpoint: string;
  warnEmpty: boolean;
  calendar: string;
  datamartIntegration: boolean;
  datamartApi: string;
  name: string;
  showTreeFlag: boolean;
}

interface ProjectProps {
  path: string;
}

@observer
class Project extends Component<ProjectProps, ProjectState> {
  private requestService: RequestService;
  private disposers: IReactionDisposer[] = [];

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
      calendar: 'leave',
      datamartIntegration: false,
      datamartApi: '',
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

    this.disposers.push(reaction(() => wikiStore.table.table, (table) => this.fetchAnnotations(table)));
    this.disposers.push(reaction(() => wikiStore.projects.showFileTree, (flag) => this.setState({showTreeFlag: flag})));
  }

  async componentWillUnmount() {
    console.log("project- componentWillUnmount");
    await wikiStore.yaml.saveYaml();

    ipcRenderer.removeListener('refresh-project', this.onRefreshProject);
    ipcRenderer.removeListener('project-settings', this.onShowSettingsClicked);
    ipcRenderer.removeListener('toggle-file-tree', this.onShowFileTreeClicked);

    for ( const disposer of this.disposers ) {
      disposer();
    }
  }

  componentDidUpdate(prevProps: ProjectProps) {
    if (this.props.path !== prevProps.path) {
      this.loadProject();
    }
  }

  async fetchAnnotations(table?: TableDTO) {
    if ( !table ) { return; }
    try {
      await this.requestService.call(this, () => (
        this.requestService.getAnnotationBlocks(
          wikiStore.projects.current!.folder,
        )
      ));
    } catch (error) {
      error.errorDescription += "\n\nCannot submit annotations!";
      this.setState({ errorMessage: error });
    }
  }

  async loadProject() {
    // before fetching project files
    wikiStore.table.showSpinner = true;
    wikiStore.wikifier.showSpinner = true;
    wikiStore.yaml.showSpinner = true;
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

    } catch (error) {
      console.log(error);

    } finally {
      wikiStore.table.showSpinner = false;
      wikiStore.wikifier.showSpinner = false;
      wikiStore.yaml.showSpinner = false;
    }

  }

  onRefreshProject() {
    this.loadProject();
  }

  async onShowSettingsClicked() {
    this.setState({
      endpoint: wikiStore.projects.projectDTO?.sparql_endpoint || "",
      warnEmpty: wikiStore.projects.projectDTO?.warn_for_empty_cells || false,
      calendar: wikiStore.projects.projectDTO?.handle_calendar || "leave",
      datamartIntegration: wikiStore.projects.projectDTO?.datamart_integration || false,
      datamartApi: wikiStore.projects.projectDTO?.datamart_api || '',
      showSettings: true
    });
  }

  onShowFileTreeClicked(checked: boolean) {
    wikiStore.projects.showFileTree = checked;
  }

  async handleSaveSettings(endpoint: string, warn: boolean, calendar:string, datamartIntegration: boolean, datamartApi: string) {
    // update settings
    this.setState({ showSettings: false });

    // notify backend
    const data = {"endpoint": endpoint,
                  "warnEmpty": warn,
                  "handleCalendar": calendar,
                  "datamartIntegration": datamartIntegration,
                  "datamartApi": datamartApi };

    try {
      await this.requestService.call(this, () => this.requestService.getSettings(this.props.path, data));
    } catch (error) {
      console.log(error);
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
          calendar={this.state.calendar}
          datamartIntegration={this.state.datamartIntegration}
          datamartApi={this.state.datamartApi}
          handleSaveSettings={this.handleSaveSettings.bind(this)}
          cancelSaveSettings={() => this.cancelSaveSettings()} />

        {/* content */}
        <div style={{ height: "calc(100vh - 50px)", background: t2wmlColors.PROJECT }}>
          <div>
            <Sidebar />
          </div>

          <SplitPane className={this.state.showTreeFlag ? "table-sidebar-open" : "table-sidebar-close" + " p-3"} split="vertical" defaultSize="55%" minSize={300} maxSize={-300}
            style={{ height: "calc(100vh - 50px)", background: t2wmlColors.PROJECT }}>
            <TableContainer />
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
