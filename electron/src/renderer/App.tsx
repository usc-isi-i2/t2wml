import React, { Component } from 'react';
import './App.css';
import ProjectList from './project-list/project-list';
import Project from './project/project';
import { observer } from 'mobx-react';
import wikiStore from './data/store';
import RequestService, { IStateWithError } from './common/service';
import { ipcRenderer, remote } from 'electron';
import { ErrorMessage, LOG } from './common/general';
import ToastMessage from './common/toast';
import { Spinner } from 'react-bootstrap';
import { IpcRendererEvent } from 'electron/renderer';
import * as path from 'path';
import * as fs from 'fs';
import GlobalSettings from './project-list/global-settings';
import CreateProject from './project/create-project';


interface AppState extends IStateWithError {
  showSpinner: boolean;
  showSettings: boolean;
  datamartIntegration: boolean;
  datamartApi: string;
  showCreateProjectModal: boolean;
}

@observer
class App extends Component<{}, AppState> {
  private requestService: RequestService;
  constructor(props: {}) {
    super(props);
    this.requestService = new RequestService();

    this.state = {
      showSpinner: false,
      errorMessage: {} as ErrorMessage,
      showSettings: false,
      datamartIntegration: false,
      datamartApi: '',
      showCreateProjectModal: false,
    }
  }

  componentDidMount() {
    ipcRenderer.on('open-project', (sender: IpcRendererEvent, folder: string) => {
      this.onOpenProject(folder);
    });
    ipcRenderer.on('new-project', () => {
      this.onNewProject();
    });
    ipcRenderer.on('toggle-cleaned', (sender: IpcRendererEvent, checked: boolean) => {
      this.onToggleCleaned(checked);
    });
    ipcRenderer.on('global-settings', () => {
      this.onShowGlobalSettings();
    });

    this.checkCommandLineArgs();

  }

  checkCommandLineArgs() {

    const commandArgs = remote.getGlobal('sharedObj').prop1;
    console.log("command args", commandArgs);

    const lastArg = commandArgs[commandArgs.length - 1];
    const projectDir = path.resolve(lastArg);
    if (fs.existsSync(projectDir) && fs.lstatSync(projectDir).isDirectory()) {
      console.log("Launched with project directory:", projectDir)
      const projectFile = path.join(projectDir, "project.t2wml");
      if (fs.existsSync(projectFile)) { //existing project
        this.onOpenProject(projectDir)
        return;
      }
      else {
        this.onNewProject()
        // this.onNewProject(projectDir)
        return;
      }
    }
    console.log("no project directory argument detected")
    wikiStore.changeWindowDisplayMode();
  }

  onToggleCleaned(checked: boolean) {
    wikiStore.table.showCleanedData = checked;
  }

  onShowGlobalSettings() {
    this.setState({
      datamartIntegration: wikiStore.project.projectDTO?.datamart_integration || false,
      datamartApi: wikiStore.project.projectDTO?.datamart_api || '',
      showSettings: true
    });
  }

  async onNewProject() {
    // console.log('Creating project in folder ', folder);
    // await this.handleNewProject(folder);
    // Open create project modal.
    this.setState({ showCreateProjectModal :true });

  }

  async onOpenProject(folder: string) {
    console.log('Opening project from folder ', folder);
    await this.handleOpenProject(folder);
  }

  async handleNewProject(folder: string) {
    // before sending request
    this.setState({ showSpinner: true });

    // send request
    try {
      await this.requestService.call(this, () => this.requestService.createProject(folder));
      console.log("<App> <- %c/create_project%c with:", LOG.link, LOG.default);
    } catch (error) {
      console.log(error);
    } finally {
      //after request
      this.setState({ showSpinner: false });
    }


  }

  async handleOpenProject(folder: string) {

    // before sending request
    this.setState({ showSpinner: true });

    // send request
    try {
      await this.requestService.call(this, () => this.requestService.getProject(folder));
      wikiStore.changeWindowDisplayMode(folder);
    } catch (error) {
      console.log(error);
    } finally {
      //after request
      this.setState({ showSpinner: false });
    }
  }

  async handleSaveSettings(datamartIntegration: boolean, datamartApi: string) {
    // update settings
    this.setState({ showSettings: false });

    // notify backend
    const data = { "datamartIntegration": datamartIntegration,
                   "datamartApi": datamartApi };

    try {
      await this.requestService.call(this, () => this.requestService.getSettings(wikiStore.project.projectDTO!.directory, data));
    } catch (error) {
      console.log(error);
    }
  }
  
  cancelSaveSettings() {
    this.setState({ showSettings: false });
  }
  
  async createProject(path: string, title: string, description: string, url: string) {
    // update settings
    console.log(title)
    debugger
    this.setState({ showCreateProjectModal: false });

    // notify backend
    // TODO!!!!!!
    // const data = { "datamartIntegration": datamartIntegration,
    //                "datamartApi": datamartApi };

    // try {
    //   await this.requestService.call(this, () => this.requestService.getSettings(wikiStore.project.projectDTO!.directory, data));
    // } catch (error) {
    //   console.log(error);
    // }
  }

  cancelCreateProject() {
    this.setState({ showCreateProjectModal: false });
  }

  render() {
    return (
      <div>
        { this.state.errorMessage.errorDescription ? <ToastMessage message={this.state.errorMessage} /> : null}

        <GlobalSettings showSettings={this.state.showSettings}
          datamartIntegration={this.state.datamartIntegration}
          datamartApi={this.state.datamartApi}
          handleSaveSettings={this.handleSaveSettings.bind(this)}
          cancelSaveSettings={() => this.cancelSaveSettings()} />

        <CreateProject 
          showCreateProjectModal={this.state.showCreateProjectModal}
          createProject={this.createProject.bind(this)}
          cancelCreateProject={() => this.cancelCreateProject()}
        />

        {/* loading spinner */}
        <div className="mySpinner" hidden={!this.state.showSpinner} style={{ height: "100%" }}>
          <Spinner animation="border" />
        </div>

        { wikiStore.displayMode === "project-list" ? <ProjectList /> : <Project path={wikiStore.projects.current!.folder} />}
      </div>
    );
  }
}

export default App;
