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
import RequestService, { IStateWithError } from '../common/service';
import ToastMessage from '../common/toast';


import { observer } from "mobx-react";
import wikiStore from '../data/store';
import Settings from './settings';
import { ipcRenderer } from 'electron';
import Sidebar from './sidebar/sidebar';
import TableContainer from './table/table-container';
import { saveFiles } from './save-files';


interface ProjectState extends IStateWithError {
  showSettings: boolean;
  endpoint: string;
  warnEmpty: boolean;
  calendar: string;
  datamartIntegration: boolean;
  datamartApi: string;
  name: string;
}

interface ProjectProps {
  path: string;
}

@observer
class Project extends Component<ProjectProps, ProjectState> {
  private requestService: RequestService;

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
    };

    // Bind the handlers that are tied to ipcRenderer and needs to be removed
    this.onRefreshProject = this.onRefreshProject.bind(this);
    this.onShowSettingsClicked = this.onShowSettingsClicked.bind(this);
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
  }

  async componentWillUnmount() {
    console.log("project- componentWillUnmount");
    await wikiStore.yaml.saveYaml();

    ipcRenderer.removeListener('refresh-project', this.onRefreshProject);
    ipcRenderer.removeListener('project-settings', this.onShowSettingsClicked);
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
    wikiStore.yaml.showSpinner = true;
    wikiStore.output.isDownloadDisabled = true;

    // fetch project files
    console.debug('Refreshing project ', this.props.path);
    try {
      await this.requestService.call(this, () => this.requestService.getProject(this.props.path));
      if (saveFiles.currentState.dataFile && saveFiles.currentState.sheetName) {
        await this.requestService.call(this, () => this.requestService.getYamlCalculation());
      }
      
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

          {/* defaultSize={parseInt(localStorage.getItem('splitPos'), 10) as string}
            onChange={(size) => localStorage.setItem('splitPos', size)} */}
          <SplitPane className="" split="vertical" defaultSize="20%" minSize={100} maxSize={-100}
            style={{ height: "calc(100vh - 50px)", background: t2wmlColors.PROJECT }}>
            <Sidebar />
            <SplitPane className="" split="vertical" defaultSize="55%" minSize={300} maxSize={-300}>
              <TableContainer />
              <SplitPane className="" split="horizontal" defaultSize="60%" minSize={200} maxSize={-200}>
                <Editors />
                <Output />
              </SplitPane>
            </SplitPane>
          </SplitPane>
        </div>
      </div>
    );
  }
}

export default Project;
