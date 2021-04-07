import React from 'react';

import './annotation-menu.css';
import AnnotationForm from './annotation-form';

import Draggable from 'react-draggable';
import { Toast } from 'react-bootstrap';
import { CellSelection, ErrorMessage } from '../../../common/general';
import RequestService from '../../../common/service';
import wikiStore from '../../../data/store';
import { AnnotationBlock, QNode } from '../../../common/dtos';
import { currentFilesService } from '@/renderer/common/current-file-service';

interface AnnotationMenuProperties {
  selection?: CellSelection;
  onSelectionChange: (selection: CellSelection) => void;
  selectedAnnotationBlock?: AnnotationBlock;
  annotationSuggestions: { role: any[], type: any[]};
  onDelete: any | null;
  onClose: any | null;
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

  async handleOnChange(key: string, value: string) {
    console.log('AnnotationMenu OnChange triggered for -> ', key, value);

    if ( key === 'property' ) {
      try {
        await this.requestService.call(this, () => (
          this.requestService.getProperties(value)
        ));
      } catch (error) {
        error.errorDescription += `\nWasn't able to find any properties for ${value}`;
        this.setState({ errorMessage: error });
      } finally {
        console.log('properties request finished');
      }
    }

    if ( key === 'unit' ) {

      const instanceOf: QNode = {
        label: 'unit of measurement',
        description: 'quantity, defined and adopted by convention',
        id: 'Q47574',
      }

      try {
        await this.requestService.call(this, () => (
          this.requestService.getQNodes(value, false, instanceOf)
        ));
      } catch (error) {
        error.errorDescription += `\nWasn't able to find any qnodes for ${value}`;
        this.setState({ errorMessage: error });
      } finally {
        console.log('qnodes request finished');
      }
    }
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
      return block.id !== selectedAnnotationBlock!.id;
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
          {'annotations': annotations, "title":currentFilesService.currentState.mappingFile}
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
    const {
      selection,
      onSelectionChange,
      selectedAnnotationBlock,
      annotationSuggestions,
    } = this.props;
    return (
      <AnnotationForm 
        selection={selection}
        onSelectionChange={onSelectionChange}
        selectedAnnotationBlock={selectedAnnotationBlock}
        annotationSuggestions={annotationSuggestions}
        onChange={this.handleOnChange.bind(this)}
        onDelete={this.handleOnDelete.bind(this)}
        onSubmit={this.handleOnSubmit.bind(this)} />
    )
  }

  render() {
    const { onClose } = this.props;
    const position = {x: window.innerWidth * 0.80 - 550, y: 100};
    return (
      <Draggable handle=".handle" defaultPosition={position}>
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
