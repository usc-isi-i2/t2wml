import React from 'react';

import './annotation-menu.css';
import AnnotationForm from './annotation-form';

import Draggable from 'react-draggable';
import { Toast } from 'react-bootstrap';
import { ErrorMessage } from '../../common/general';
import RequestService from '../../common/service';
import wikiStore from '../../data/store';


interface AnnotationMenuProperties {
  selections: Array<any> | null,
  position: Array<number> | null,
  onClose: any | null,
}

interface AnnotationMenuState {
  errorMessage: ErrorMessage;
}


class AnnotationMenu extends React.Component<AnnotationMenuProperties, AnnotationMenuState> {

  private requestService: RequestService;

  constructor(props: AnnotationMenuProperties) {
    super(props);

    this.requestService = new RequestService();

    this.state = {
      errorMessage: {} as ErrorMessage,
    };
  }

  handleOnChange(key: string, value: string) {
    console.log('AnnotationMenu OnChange triggered for -> ', key, value);
  }

  async handleOnSubmit(values: { [key: string]: string }) {
    const { selections } = this.props;
    console.log('AnnotationMenu OnSubmit triggered for -> ', selections, values);

    const formData = new FormData();
    for ( const [key, value] of Object.entries(values) ) {
      formData.append(key, value);
    }

    try {
      await this.requestService.call(this, () => (
        this.requestService.annotateProject(
          wikiStore.projects.current!.folder,
          formData,
        )
      ));
    } catch (error) {
      error.errorDescription += "\n\nCannot submit annotations!";
      this.setState({ errorMessage: error });
    }
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
