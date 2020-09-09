import React from 'react';
import ReactDOM from 'react-dom';
import 'bootstrap/dist/css/bootstrap.css';
import App from './App';
import Splash from './splash/Splash';

// Check whether this is the splash screen or the main app
//
// Both windows share the same JS bundle. We may want to separate these into two bundles
// in the future
const splashId = document.getElementById('splash');
if (splashId) {
  ReactDOM.render(
    <React.StrictMode>
      <Splash />
    </React.StrictMode>,
    splashId
  );
} else {
  ReactDOM.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
    document.getElementById('root')
  );
}
