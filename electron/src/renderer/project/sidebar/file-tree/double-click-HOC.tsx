import React, { Component } from 'react';
//taken from stackoverflow: https://stackoverflow.com/a/48835180/5961793

interface funcProps {
  onClick: any,
  onDoubleClick: any,
  children: any,
}


export default class DoubleClick extends Component<funcProps> {
  timeout?: number;

  constructor(props: funcProps) {
    super(props);
    this.onClick = this.onClick.bind(this);
    this.onDoubleClick = this.onDoubleClick.bind(this);
    this.timeout = undefined;
  }

  onClick(e: React.MouseEvent) {
    e.preventDefault();
    if (!this.timeout) {
      this.timeout = window.setTimeout(() => {
        this.props.onClick();
        this.timeout = undefined;
      }, 500);
    }
  }

  onDoubleClick(e: React.MouseEvent) {
    e.preventDefault();

    if (this.timeout) {
      window.clearTimeout(this.timeout);
    }
    this.timeout = undefined;
    this.props.onDoubleClick(e);
  }

  render() {
    // eslint-disable-next-line
    const { onClick, onDoubleClick, children, ...childProps } = this.props;
    const props = Object.assign(childProps, { onClick: this.onClick, onDoubleClick: this.onDoubleClick });
    return React.cloneElement(children, props);
  }
}

