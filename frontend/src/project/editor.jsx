import React, { Component } from 'react';

import Wikifier from './wikifier';
import YamlEditor from './yaml-editor';

class Editors extends Component {
  constructor(props) {
    super(props);

    // init global variables
    window.Editors = this;

    // init state
    this.state = {
      nowShowing: "Wikifier",
    };
  }

  render() {
    const { nowShowing } = this.state;
    return (
      <div className="w-100 h-100 p-1">
        <Wikifier isShowing={nowShowing === "Wikifier"} />
        <YamlEditor isShowing={nowShowing === "YamlEditor"} />
      </div>
    );
  }
}

export default Editors;