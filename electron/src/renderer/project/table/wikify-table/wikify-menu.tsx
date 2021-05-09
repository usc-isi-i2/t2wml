import React from 'react';

import './wikify-menu.css';
import WikifyForm from './wikify-form';

import Draggable from 'react-draggable';
import { Toast } from 'react-bootstrap';
import { ErrorMessage } from '../../../common/general';
import RequestService from '../../../common/service';
import { QNode } from '@/renderer/common/dtos';
import { Cell, CellSelection } from '../../../common/general';
import wikiStore from '../../../data/store';
import * as utils from '../table-utils';


interface WikifyMenuProperties {
  selectedCell: Cell;
  position: Array<number>;
  wikifyCellContent?: string;
  onSelectBlock: (applyToBlock: boolean) => void;
  onClose: () => void;
}


interface WikifyMenuState {
  errorMessage: ErrorMessage;
}


class WikifyMenu extends React.Component<WikifyMenuProperties, WikifyMenuState> {

  private requestService: RequestService;

  constructor(props: WikifyMenuProperties) {
    super(props);

    this.requestService = new RequestService();

    this.state = {
      errorMessage: {} as ErrorMessage,
    };
  }

  async handleOnChange(key: string, value?: string, instanceOf?: QNode, searchProperties?: boolean) {
    console.log('WikifyMenu OnChange triggered for -> ', key, value);

    if (!value) { return; }

    const isClass = key === 'instanceOfSearch';
    try {
      await this.requestService.call(this, () => (
        this.requestService.getQNodes(value, isClass, instanceOf, searchProperties)
      ));
    } catch (error) {
      error.errorDescription += `\nWasn't able to find any qnodes for ${value}`;
      this.setState({ errorMessage: error });
    } finally {
      console.log('qnodes request finished');
    }
  }

  async handleOnSubmit(qnode: QNode, applyToBlock: boolean) {
    console.log('WikifyMenu OnSubmit triggered for -> ', qnode);

    let hasError=false;

    wikiStore.table.showSpinner = true;
    wikiStore.wikifier.showSpinner = true;
    wikiStore.yaml.showSpinner = true;

    const { selectedCell, wikifyCellContent } = this.props;
    const { col, row } = selectedCell;

    let selection = [[col, row], [col, row]];
    if (applyToBlock) {
      const cellSelection: CellSelection = { x1: col + 1, x2: col + 1, y1: row + 1, y2: row + 1 };
      const selectedBlock = utils.checkSelectedAnnotationBlocks(cellSelection);
      if (selectedBlock) {
        selection = [
          [selectedBlock.selection.x1 - 1, selectedBlock.selection.y1 - 1],
          [selectedBlock.selection.x2 - 1, selectedBlock.selection.y2 - 1],
        ];
      }
    }

    try {
      await this.requestService.call(this, () => (
        this.requestService.postQNodes({
          value: wikifyCellContent,
          selection,
          qnode,
        })
      ));
    } catch (error) {
      error.errorDescription = `Wasn't able to submit the qnode!\n` + error.errorDescription;
      console.log(error.errorDescription)
      this.setState({ errorMessage: error });
      hasError=true;
    } finally {
      wikiStore.table.showSpinner = false;
      wikiStore.wikifier.showSpinner = false;
      wikiStore.yaml.showSpinner = false;
    }

    //also update results:
    if (!hasError){
    try {
      wikiStore.output.showSpinner = true;
      await this.requestService.call(this, () => this.requestService.getMappingCalculation())
    }
    catch (error) {
      console.log(error) //don't break on this
    }
    finally{
      wikiStore.output.showSpinner = false;
      this.props.onClose();
    }
    wikiStore.wikifier.showSpinner = true;
    try {
      await this.requestService.getPartialCsv();
    }
    finally {
      wikiStore.wikifier.showSpinner = false;
    }}
  }

  async handleOnRemove(qnode: QNode, applyToBlock: boolean) {
    console.log('WikifyMenu OnRemove triggered for -> ', qnode);
    let hasError=false;

    wikiStore.table.showSpinner = true;
    wikiStore.wikifier.showSpinner = true;
    wikiStore.yaml.showSpinner = true;

    const { selectedCell, wikifyCellContent } = this.props;
    const { col, row } = selectedCell;

    let selection = [[col, row], [col, row]];
    if ( applyToBlock ) {
      const cellSelection: CellSelection = {x1: col+1, x2: col+1, y1: row+1, y2: row+1};
      const selectedBlock = utils.checkSelectedAnnotationBlocks(cellSelection);
      if ( selectedBlock ) {
        selection = [
          [selectedBlock.selection.x1 - 1, selectedBlock.selection.y1 - 1],
          [selectedBlock.selection.x2 - 1, selectedBlock.selection.y2 - 1],
        ];
      }
    }

    try {
      await this.requestService.call(this, () => (
        this.requestService.removeQNodes({
          value: wikifyCellContent,
          selection,
          qnode,
        })
      ));
    } catch (error) {
      error.errorDescription += `Wasn't able to submit the qnode!\n` + error.errorDescription;
      console.log(error.errorDescription)
      this.setState({ errorMessage: error });
      hasError=true;
    } finally {
      wikiStore.table.showSpinner = false;
      wikiStore.wikifier.showSpinner = false;
      wikiStore.yaml.showSpinner = false;

      // Close the wikify menu on submit
      if (!hasError){
        this.props.onClose();
      }

    }
  }

  renderHeader() {
    const { selectedCell } = this.props;
    if (!selectedCell) { return null; }
    const { col, row } = selectedCell;
    return (
      <Toast.Header className="handle">
        <strong className="mr-auto">
          Selected: {utils.columnToLetter(col + 1)}{row + 1}
        </strong>
      </Toast.Header>
    )
  }

  renderWikifyForms() {
    const { selectedCell, onSelectBlock } = this.props;
    return (
      <WikifyForm
        selectedCell={selectedCell}
        onSelectBlock={(applyToBlock) => onSelectBlock(applyToBlock)}
        onChange={this.handleOnChange.bind(this)}
        onSubmit={this.handleOnSubmit.bind(this)}
        onRemove={this.handleOnRemove.bind(this)} />
    )
  }

  render() {
    const { position, onClose } = this.props;
    return (
      <Draggable handle=".handle"
        defaultPosition={{ x: position[0], y: position[1] }}>
        <div className="wikify-menu">
          <Toast onClose={onClose}>
            {this.renderHeader()}
            <Toast.Body>
            <div style={{ color: 'red' }}>
                            {this.state.errorMessage.errorDescription}
                          </div>
              {this.renderWikifyForms()}

            </Toast.Body>
          </Toast>
        </div>
      </Draggable>
    )
  }
}


export default WikifyMenu
