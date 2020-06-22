import React from 'react';
import './App.css';
import {
  BrowserRouter as Router,
  Switch,
  Route,
} from "react-router-dom";
import Login from './login/login';
import ProjectList from './project-list/project-list';
import Project from './project/project';

function App() {
  return (
    <Router>
      <Switch>
        <Route exact path="/">
          <Login />
        </Route>
        <Route path="/project/:id">
          <Project />
        </Route>
        <Route path="/projects">
          <ProjectList />
        </Route>
      </Switch>
  </Router>
  );
}

export default App;
