import React from 'react';

import './wikify-menu.css';
import WikifyForm from './wikify-form';

import Draggable from 'react-draggable';
import { Toast } from 'react-bootstrap';
import { ErrorMessage } from '../../../common/general';
import RequestService from '../../../common/service';
import { Cell } from '../../../common/general';
import wikiStore from '../../../data/store';
import * as utils from '../table-utils';


interface WikifyMenuProperties {
  selectedCell: Cell;
  position: Array<number>;
  wikifyCellContent?: string;
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

  async handleOnChange(key: string, value: string) {
    console.log('WikifyMenu OnChange triggered for -> ', key, value);

    if ( value.length < 4 ) { return; }
    try {
      await this.requestService.call(this, () => (
        this.requestService.getQNodes(value)
      ));
    } catch (error) {
      error.errorDescription += "\n\nCannot fetch qnodes!";
      this.setState({ errorMessage: error });
    } finally {
      console.log('qnodes request finished');
    }

  }

  async handleOnSubmit(values: { [key: string]: string }) {
    console.log('WikifyMenu OnSubmit triggered for -> ', values);

    wikiStore.table.showSpinner = true;
    wikiStore.wikifier.showSpinner = true;
    wikiStore.yaml.showSpinner = true;

    const { selectedCell, wikifyCellContent } = this.props;
    const { col, row } = selectedCell;

    try {
      await this.requestService.call(this, () => (
        this.requestService.postQNodes({
          col,
          row,
          value: wikifyCellContent,
          ...values,
        })
      ));
    } catch (error) {
      error.errorDescription += "\n\nCannot submit qnodes!";
      this.setState({ errorMessage: error });
    } finally {
      console.log('qnodes request finished');

      wikiStore.table.showSpinner = false;
      wikiStore.wikifier.showSpinner = false;
      wikiStore.yaml.showSpinner = false;

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
    return (
      <WikifyForm
        onChange={this.handleOnChange.bind(this)}
        onSubmit={this.handleOnSubmit.bind(this)} />
    )
  }

  render() {
    const { position, onClose } = this.props;
    return (
      <Draggable handle=".handle"
        defaultPosition={{x: position[0], y: position[1]}}>
        <div className="wikify-menu">
          <Toast onClose={onClose}>
            {this.renderHeader()}
            <Toast.Body>
              {this.renderWikifyForms()}
            </Toast.Body>
          </Toast>
        </div>
      </Draggable>
    )
  }
}


export default WikifyMenu
