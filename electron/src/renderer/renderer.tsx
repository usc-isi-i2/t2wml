/**
 * React renderer.
 */
import * as React from 'react';
import * as ReactDOM from 'react-dom';

// Import the styles here to process them with webpack
import '@public/style.css';
import { Comm } from './comm';

ReactDOM.render(
  <div className='app'>
    <Comm/>
  </div>,
  document.getElementById('app')
);
