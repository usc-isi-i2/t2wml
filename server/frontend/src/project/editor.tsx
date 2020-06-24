import React, { Component } from 'react';

import Wikifier from './wikifier';
import YamlEditor from './yaml-editor';

import { observer } from "mobx-react"
import wikiStore from '../data/store';


@observer
class Editors extends Component {
  render() {
    const nowShowing = wikiStore.editors.nowShowing;
    
    return (
      <div className="w-100 h-100 p-1">
        <Wikifier isShowing={nowShowing === "Wikifier"} />
        <YamlEditor isShowing={nowShowing === "YamlEditor"} />
      </div>
    );
  }
}

export default Editors;