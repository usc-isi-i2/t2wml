import React from 'react';

// App
import './table-toast.css';
import { Toast } from 'react-bootstrap';


interface TableToastProperties {
  message: string,
  onClose: (toastNum:string) => void;
}


class TableToast extends React.Component<TableToastProperties, {}> {

  renderToastBody() {
    const { qnode } = this.props;
    if ( !qnode ) { return; }
    return (
      <Toast.Body>
        <strong>{qnode.label}</strong> ({!!qnode.url ? (
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
    const { text, onClose } = this.props;
    return (
      <div className="table-toast">
        <Toast onClose={() => onClose()}>
          {this.renderToastHeader()}
          {this.renderToastBody()}
        </Toast>
      </div>
    );
  }
}


export default TableToast;
