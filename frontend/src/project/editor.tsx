import React, { Component } from 'react';

import Wikifier from './wikifier';
import YamlEditor from './yaml-editor';
import { ErrorCell } from '../common/general';

interface EditorProperties {
  showErrorCellsInTable: (error: ErrorCell) => void;
}

interface EditorState {
  nowShowing: string;
}

class Editors extends Component<EditorProperties, EditorState> {
  constructor(props: EditorProperties) {
    super(props);

    // init global variables
    (window as any).Editors = this;

    // init state
    this.state = {
      nowShowing: "Wikifier",
    };
  }

  showErrorCells(error: ErrorCell) {
    console.log(error);
    this.props.showErrorCellsInTable(error);
  }

  render() {
    const { nowShowing } = this.state;
    return (
      <div className="w-100 h-100 p-1">
        <Wikifier isShowing={nowShowing === "Wikifier"} />
        <YamlEditor
            isShowing={nowShowing === "YamlEditor"}
            showErrorCells={(error: ErrorCell) => this.showErrorCells(error)} />
      </div>
    );
  }
}

export default Editors;