import React from 'react';

// App
import './table-toast.css';
import { Toast } from 'react-bootstrap';


interface TableToastProperties {
  message: string,
  onClose: (toastNum:string) => void;
}


class TableToast extends React.Component<TableToastProperties, {}> {

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
        </Toast>
      </div>
    );
  }
}


export default TableToast;
