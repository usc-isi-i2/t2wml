import React, { Component } from 'react';
import './App.css';
import {
  MemoryRouter as Router,
  Switch,
  Route,
  useHistory
} from "react-router-dom";
import ProjectList from './project-list/project-list';
import Project from './project/project';
import { ipcRenderer, EventEmitter } from 'electron';


// to open-project
import { LOG, ErrorMessage } from './common/general';
import RequestService from './common/service';


class App extends Component<{}, {}> {
  private requestService: RequestService;
  constructor(props: {}) {
    super(props);
    this.requestService = new RequestService();
  }

  componentDidMount() {
    ipcRenderer.on('open-project', (sender: EventEmitter, folder: string) => {
      this.onOpenProject(folder);
    });
    ipcRenderer.on('new-project', (sender: EventEmitter, folder: string) => {
      this.onNewProject(folder);
    });
  }

  onNewProject(folder: string) {
    console.log('Creating project in folder ', folder);
    this.handleNewProject(folder);
  }
  
  onOpenProject(folder: string) {
    console.log('Opening project from folder ', folder);
    this.handleOpenProject(folder);
  }

  async handleNewProject(folder: string) {
    // this.setState({ errorMessage: {} as ErrorMessage });

    // before sending request
    // this.setState({ showSpinner: true });

    // send request
    const formData = new FormData();
    formData.append("path", folder);
    try {
      const response = await this.requestService.createProject(formData);
    
      console.log("<App> <- %c/create_project%c with:", LOG.link, LOG.default);
      console.log(response);

      // do something here
      if (response["pid"]) {
        // success
        const history = useHistory();
        history.push("/project/" + response["pid"]);
      } else {
        // failure
        throw Error("Session doesn't exist or invalid request");
      }

      // follow-ups (success)
      // this.setState({ showCreateProject: false, showSpinner: false });

    } catch (error) { // :ErrorDEscription
      error.errorDescription += "\n\nCannot create project!";
      // this.setState({ errorMessage: error });

      // follow-ups (failure)
      // this.setState({ showCreateProject: false, showSpinner: false });
    }
  }

  async handleOpenProject(folder: string) {
    this.setState({ errorMessage: {} as ErrorMessage });

    // before sending request
    this.setState({ showSpinner: true });

    // send request
    const formData = new FormData();
    formData.append("path", folder);
    try {
      const response = await this.requestService.loadProject(formData);
    
      console.log("<App> <- %c/load_project%c with:", LOG.link, LOG.default);
      console.log(response);

      // do something here
      if (response["pid"]) {
        // success
        const history = useHistory();
        history.push("/project/" + response["pid"]);
      } else {
        // failure
        throw Error("Session doesn't exist or invalid request");
      }

      // follow-ups (success)
      this.setState({ showLoadProject: false, showSpinner: false });

    } catch (error) { // :ErrorDEscription
      error.errorDescription += "\n\nCannot load project!";
      this.setState({ errorMessage: error });

      // follow-ups (failure)
      this.setState({ showLoadProject: false, showSpinner: false });
    }
  }

  render() {
    return (
      <Router>
        <Switch>
          <Route exact path="/project/:id">
            <Project />
          </Route>
          <Route path="*">
            <ProjectList />
          </Route>
        </Switch>
      </Router>
    );
  }
}

export default App;
