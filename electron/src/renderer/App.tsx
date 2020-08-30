import React, { Component } from 'react';
import './App.css';
import {
  MemoryRouter as Router,
  Switch,
  Route,
} from "react-router-dom";
import ProjectList from './project-list/project-list';
import Project from './project/project';
import { ipcRenderer, EventEmitter } from 'electron';

class App extends Component<{}, {}> {

  componentDidMount() {
    ipcRenderer.on('open-project', (sender: EventEmitter, folder: string) => {
      this.onOpenProject(folder);
    })
  }

  onOpenProject(folder: string) {
    console.log('Opening folder ', folder);
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
