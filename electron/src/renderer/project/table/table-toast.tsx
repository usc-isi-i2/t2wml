import React from 'react';

// App
import './table-toast.css';
import { Toast } from 'react-bootstrap';
import { QNode } from '@/renderer/common/dtos';


interface TableToastProperties {
  message?: string,
  qnode: QNode,
  text: string,
  onClose: () => void;
}


class TableToast extends React.Component<TableToastProperties, {}> {

  renderToastBody() {
    const { qnode } = this.props;
    if (!qnode) { return; }
    return (
      <Toast.Body>
        <strong>{qnode.label}</strong> ({qnode.url ? (
          <a target="_blank"
            rel="noopener noreferrer"
            className="type-qnode"
            href={qnode.url}>
            {qnode.id}
          </a>
        ) : (
            <span>{qnode.id}</span>
          )})
        <br />
        <br />
        {qnode.description}
      </Toast.Body>
    );
  }

  renderToastHeader() {
    const { text } = this.props;
    return (
      <Toast.Header>
        <span className="mr-auto font-weight-bold">
          {text}
        </span>
      </Toast.Header>
    )
  }

  render() {
    return (
      <div className="table-toast">
        <Toast onClose={() => this.props.onClose()}>
          {this.renderToastHeader()}
          {this.renderToastBody()}
        </Toast>
      </div>
    );
  }
}


export default TableToast;
