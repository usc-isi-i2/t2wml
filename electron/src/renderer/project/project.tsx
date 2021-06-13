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
import RequestService, { IStateWithError } from '../common/service';
import ToastMessage from '../common/toast';

import { observer } from "mobx-react";
import wikiStore from '../data/store';
import Settings from './modals/project-settings';
import { remote, ipcRenderer } from 'electron';
import Sidebar from './sidebar/sidebar';
import { currentFilesService } from '../common/current-file-service';
import EntitiesWindow from './entities/entities-window';
import CombinedTable from './table/combined-table';
import BlockCellYamlMenu from './block-cell-yaml-menu';


interface ProjectState extends IStateWithError {
  showSettings: boolean;
  showEntities: boolean;
  endpoint: string;
  warnEmpty: boolean;
  calendar: string;
  title: string;
  description: string;
  url: string;
  name: string;
  entityProperties: any; // TODO: add type
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
    if (wikiStore.project.projectDTO) {
      wikiStore.project.projectDTO.sparql_endpoint = Config.defaultSparqlEndpoint;
    }
    // init state
    this.state = {

      // appearance
      showSettings: false,
      showEntities: false,
      endpoint: '',
      warnEmpty: false,
      calendar: 'leave',
      title: '',
      description: '',
      url: '',
      name: '',
      entityProperties: [],

      errorMessage: {} as ErrorMessage,
    };

    // Bind the handlers that are tied to ipcRenderer and needs to be removed
    this.onRefreshProject = this.onRefreshProject.bind(this);
    this.onShowSettingsClicked = this.onShowSettingsClicked.bind(this);
    this.onUploadWikifier = this.onUploadWikifier.bind(this)
  }

  componentDidMount() {
    console.log("project- componentDidMount");
    if (this.props.path) {
      this.loadProject();
    } else {
      console.error("There is no project id.")
    }
    ipcRenderer.on('refresh-project', this.onRefreshProject);
    ipcRenderer.on('upload-wikifier', this.onUploadWikifier);
    ipcRenderer.on('project-settings', this.onShowSettingsClicked);
    ipcRenderer.on('project-entities', () => this.onShowEntitiesClicked());
  }

  async componentWillUnmount() {
    console.log("project- componentWillUnmount");
    await wikiStore.yaml.saveYaml();

    ipcRenderer.removeListener('refresh-project', this.onRefreshProject);
    ipcRenderer.removeListener('upload-wikifier', this.onUploadWikifier);
    ipcRenderer.removeListener('project-settings', this.onShowSettingsClicked);
    ipcRenderer.removeListener('project-entities', () => this.onShowEntitiesClicked());
  }

  componentDidUpdate(prevProps: ProjectProps) {
    if (this.props.path !== prevProps.path) {
      this.loadProject();
    }
  }


  async loadProject() {
    // before fetching project files
    wikiStore.table.showSpinner = true;
    wikiStore.yaml.showSpinner = true;
    wikiStore.output.isDownloadDisabled = true;

    // fetch project files
    console.debug('Refreshing project ', this.props.path);
    try {
      await this.requestService.call(this, () => this.requestService.getProject(this.props.path));
      if (currentFilesService.currentState.dataFile && currentFilesService.currentState.sheetName) {
        await this.requestService.call(this, () => this.requestService.getTable());
      }

      if (wikiStore.project.projectDTO) {
        document.title = 't2wml: ' + wikiStore.project.projectDTO.title;
        this.setState({ name: wikiStore.project.projectDTO.title });

        if (wikiStore.yaml.yamlContent !== null) {
          wikiStore.output.isDownloadDisabled = false;
        }

        // load settings
        if (!wikiStore.project.projectDTO.sparql_endpoint) {
          wikiStore.project.projectDTO.sparql_endpoint = Config.defaultSparqlEndpoint;
        }
      }

    } catch (error) {
      console.log(error);

    } finally {
      wikiStore.table.showSpinner = false;
      wikiStore.yaml.showSpinner = false;
    }
    if (currentFilesService.currentState.dataFile && currentFilesService.currentState.sheetName) {
      wikiStore.wikifier.showSpinner = true;
      try {
        await this.requestService.getPartialCsv();
      }
      finally {
        wikiStore.wikifier.showSpinner = false;
      }
    }

  }

  onRefreshProject() {
    this.loadProject();
  }

  onUploadWikifier(){
    this.uploadWikifier();
  }

  async uploadWikifier() {
    let title = "Open Existing Wikifier File"
    let filters = [{ name: "wikifier", extensions: ["csv"] }]
    const result = await remote.dialog.showOpenDialog({
      title: title,
      defaultPath: wikiStore.project.projectDTO!.directory,
      properties: ['createDirectory'],
      filters: filters,
    });
    if (!result.canceled && result.filePaths) {
      try {
        debugger
        const data = { "filepath": result.filePaths[0] };
        wikiStore.table.showSpinner = true;
        wikiStore.yaml.showSpinner = true;
        await this.requestService.uploadWikifierOutput(data);
        await this.requestService.getTable();
        this.requestService.getPartialCsv();
      } catch (error) {
        console.log(error);
      }finally{
        wikiStore.table.showSpinner = false;
        wikiStore.yaml.showSpinner = false;
      }
    }
  }

  onShowSettingsClicked() {
    this.setState({
      endpoint: wikiStore.project.projectDTO?.sparql_endpoint || "",
      warnEmpty: wikiStore.project.projectDTO?.warn_for_empty_cells || false,
      calendar: wikiStore.project.projectDTO?.handle_calendar || "leave",
      title: wikiStore.project.projectDTO?.title || "",
      description: wikiStore.project.projectDTO?.description || "",
      url: wikiStore.project.projectDTO?.url || "",
      showSettings: true
    });
  }

  async onShowEntitiesClicked() {
    await this.requestService.getEntities();

    this.setState({
      entityProperties: wikiStore.entitiesData.entities,
      showEntities: true
    });
  }

  async handleSaveSettings(endpoint: string, warn: boolean, calendar: string, title: string, description?: string, url?: string) {
    // update settings
    this.setState({ showSettings: false });

    // notify backend
    const data = {
      "endpoint": endpoint,
      "warnEmpty": warn,
      "handleCalendar": calendar,
      "title": title,
      "description": description,
      "url": url
    };

    try {
      await this.requestService.call(this, () => this.requestService.putSettings(this.props.path, data));
    } catch (error) {
      console.log(error);
    }
  }

  cancelSaveSettings() {
    this.setState({ showSettings: false });
  }

  async handleSaveEntities(file: string, property: string, propertyVals: any) {
    const data = {
      entity_file: file,
      updated_entries: { [property]: propertyVals },
    }
    try {
      await this.requestService.saveEntities(data);
    } catch (error) {
      console.log(error);
    } finally {
      //this.setState({ showEntities: false });
    }
  }

  cancelSaveEntities() {
    this.setState({ showEntities: false });
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
          title={this.state.title}
          description={this.state.description}
          url={this.state.url}
          endpoint={this.state.endpoint}
          warnEmpty={this.state.warnEmpty}
          calendar={this.state.calendar}
          handleSaveSettings={this.handleSaveSettings.bind(this)}
          cancelSaveSettings={() => this.cancelSaveSettings()} />

        <EntitiesWindow showEntities={this.state.showEntities}
          properties={this.state.entityProperties}
          handleSaveEntities={this.handleSaveEntities.bind(this)}
          cancelSaveEntities={() => this.cancelSaveEntities()} />

        {/* content */}
        <div style={{ height: "calc(100vh - 50px)", background: t2wmlColors.PROJECT }}>

          {/* defaultSize={parseInt(localStorage.getItem('splitPos'), 10) as string}
            onChange={(size) => localStorage.setItem('splitPos', size)} */}
          <SplitPane className="" split="vertical" defaultSize="15%" minSize={200} maxSize={-1000}
            style={{ height: "calc(100vh - 50px)", background: t2wmlColors.PROJECT }}>
            <Sidebar />
            <SplitPane className="" primary="second" split="vertical" defaultSize="35%" minSize={300} maxSize={-300}>
            <SplitPane className="" split="horizontal" defaultSize="100%">
              <CombinedTable /> <div></div>
              </SplitPane>
                <BlockCellYamlMenu />
            </SplitPane>
          </SplitPane>
        </div>
      </div>
    );
  }
}

export default Project;
