import React from 'react';
import './App.css';
import {
  BrowserRouter as Router,
  Switch,
  Route,
} from "react-router-dom";
import ProjectList from './project-list/project-list';
import Project from './project/project';

function App() {
  return (
    <Router>
      <Switch>
        <Route path="/project/:id">
          <Project />
        </Route>
        <Route exact path="/">
          <ProjectList />
        </Route>
      </Switch>
  </Router>
  );
}

export default App;
