import React from 'react';

// App
import './table-toast.css';
import { Toast } from 'react-bootstrap';


interface TableToastProperties {
  message: string,
  onClose: (toastNum:string) => void;
}


class TableToast extends React.Component<TableToastProperties, {}> {

  render() {
    const { message, onClose } = this.props;
    return (
      <div className="table-toast">
        <Toast onClose={() => onClose()}>
          <Toast.Header>
            <span className="mr-auto font-weight-bold">
              {message}
            </span>
          </Toast.Header>
        </Toast>
      </div>
    );
  }
}


export default TableToast;
