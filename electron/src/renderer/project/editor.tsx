import React, { Component } from 'react';

import PartialCsvPreview from './wikifier/wikifier';
import YamlEditor from './yaml-editor/yaml-editor';
import { observer } from "mobx-react"

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
      nowShowing: "",
    };
  }

  render() {
    return (
      <div className="w-100 h-100 p-1">
        <PartialCsvPreview />
        <YamlEditor/>
      </div>
    );
  }
}

export default Editors;
