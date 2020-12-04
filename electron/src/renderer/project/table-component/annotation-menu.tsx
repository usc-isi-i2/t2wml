import React from 'react';

import './annotation-menu.css';
import AnnotationForm from './annotation-form';

import Draggable from 'react-draggable';
import { Toast } from 'react-bootstrap';
import { CellSelection } from '../../common/general';


interface AnnotationMenuProperties {
  selections: Array<any> | null,
  position: Array<number> | null,
  onClose: any | null,
}


class AnnotationMenu extends React.Component<AnnotationMenuProperties, {}> {

  handleOnChange(key: string, value: string) {
    console.log('AnnotationMenu OnChange triggered for -> ', key, value);
  }

  handleOnSubmit(values: any) {
    const { selections } = this.props;
    console.log('AnnotationMenu OnSubmit triggered for -> ', selections, values);
  }

  renderAnnotationForms() {
    const { selections } = this.props;
    return (
      <AnnotationForm
        selections={selections}
        onChange={this.handleOnChange.bind(this)}
        onSubmit={this.handleOnSubmit.bind(this)} />
    )
  }

  render() {
    const { position, onClose } = this.props;
    let style = {};
    if (position) {
      style = {
        'left': position[0],
        'top': position[1],
      };
    }
    return (
      <div className="annotation-menu" style={style}>
        <Draggable handle=".handle">
          <Toast onClose={onClose}>
            <Toast.Header className="handle">
              <strong className="mr-auto">Annotate selected areas</strong>
            </Toast.Header>
            <Toast.Body>
              {this.renderAnnotationForms()}
            </Toast.Body>
          </Toast>
        </Draggable>
      </div>
    )
  }
}


export default AnnotationMenu
