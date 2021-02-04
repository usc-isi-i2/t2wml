import React from 'react';

import './annotation-menu.css';
import AnnotationForm from './annotation-form';

import Draggable from 'react-draggable';
import { Toast } from 'react-bootstrap';
import { CellSelection, ErrorMessage } from '../../../common/general';
import RequestService from '../../../common/service';
import wikiStore from '../../../data/store';
import { AnnotationBlock } from '../../../common/dtos';

interface AnnotationMenuProperties {
  selection?: CellSelection,
  position: Array<number>, // We will eliminate this once we figure out how to calculate the window width
  onDelete: any | null,
  onClose: any | null,
  selectedAnnotationBlock?: AnnotationBlock,
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

  handleOnDelete() {
    const { selectedAnnotationBlock, selection, onDelete } = this.props;
    console.log('AnnotationMenu OnDelete triggered for -> ', selection);

    const annotations = wikiStore.annotations.blocks.filter(block => {
      return block !== selectedAnnotationBlock;
    });

    this.postAnnotations(annotations);

    onDelete(selectedAnnotationBlock);
  }

  handleOnSubmit(values: { [key: string]: string }) {
    const { selectedAnnotationBlock, selection } = this.props;
    console.log('AnnotationMenu OnSubmit triggered for -> ', selection, values);

    const annotations = wikiStore.annotations.blocks.filter(block => {
      return block !== selectedAnnotationBlock;
    });

    const annotation: any = {
      'selection': selection,
    };

    // Add all updated values from the annotation form
    for ( const [key, value] of Object.entries(values) ) {
      annotation[key] = value;
    }

    annotations.push(annotation);

    this.postAnnotations(annotations);
  }

  async postAnnotations(annotations: AnnotationBlock[]) {
    const { onClose } = this.props;

    try {
      await this.requestService.call(this, () => (
        this.requestService.postAnnotationBlocks(
          { 'annotations': annotations }
        )
      ));
    } catch (error) {
      error.errorDescription += "\n\nCannot submit annotations!";
      this.setState({ errorMessage: error });
    } finally {
      onClose();
    }
  }

  renderAnnotationForms() {
    const { selection, selectedAnnotationBlock } = this.props;
    return (
      <AnnotationForm
        selection={selection}
        selectedAnnotationBlock={selectedAnnotationBlock}
        onChange={this.handleOnChange.bind(this)}
        onDelete={this.handleOnDelete.bind(this)}
        onSubmit={this.handleOnSubmit.bind(this)} />
    )
  }

  render() {
    const { position, onClose } = this.props;
    return (
      <Draggable handle=".handle"
        defaultPosition={{x: position[0], y: position[1]}}>
        <div className="annotation-menu">
          <Toast onClose={onClose}>
            <Toast.Header className="handle">
              <strong className="mr-auto">Annotate selected areas</strong>
            </Toast.Header>
            <Toast.Body>
              {this.renderAnnotationForms()}
            </Toast.Body>
          </Toast>
        </div>
      </Draggable>
    )
  }
}


export default AnnotationMenu
