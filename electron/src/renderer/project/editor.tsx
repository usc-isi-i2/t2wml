import React, { Component } from 'react';

import Wikifier from './wikifier/wikifier';
import YamlEditor from './yaml-editor';
import { observer } from "mobx-react"
import wikiStore from '../data/store';

interface EditorState {
  nowShowing: string;
}

@observer
class Editors extends Component<{}, EditorState> {
  constructor(props: {}) {
    super(props);

    // init global variables
    (window as any).Editors = this;

    // init state
    this.state = {
      nowShowing: "Wikifier",
    };
  }

  render() {
    const nowShowing = wikiStore.editors.nowShowing;
    
    return (
      <div className="w-100 h-100 p-1">
        <Wikifier isShowing={nowShowing === "Wikifier"} />
        <YamlEditor
            isShowing={nowShowing === "YamlEditor"}/>
      </div>
    );
  }
}

export default Editors;