import React from 'react';

import './wikify-menu.css';
import WikifyForm from '../wikify-form';

import { ErrorMessage } from '../../../common/general';
import RequestService from '../../../common/service';
import { EntityFields, QNode } from '@/renderer/common/dtos';
import { Cell, CellSelection } from '../../../common/general';
import wikiStore from '../../../data/store';
import * as utils from '../../table/table-utils';
import { Card, Form } from 'react-bootstrap';
import { IReactionDisposer, reaction } from 'mobx';
import ToastMessage from '@/renderer/common/toast';


interface WikifyMenuState {
  errorMessage: ErrorMessage;
  selectedCell?: Cell;
}


class WikifyMenu extends React.Component<{}, WikifyMenuState> {

  private requestService: RequestService;
  private disposers: IReactionDisposer[] = [];

  constructor(props: {}) {
    super(props);

    this.requestService = new RequestService();

    this.state = {
      errorMessage: {} as ErrorMessage,
      selectedCell: wikiStore.table.selection.selectedCell
    };
  }
  componentDidMount() {
    this.disposers.push(reaction(() => wikiStore.table.selection.selectedCell, (selectedCell) => this.setState({ selectedCell })));
  }

  componentWillUnmount() {
    for (const disposer of this.disposers) {
      disposer();
    }
  }


  onSelectBlock(applyToBlock: boolean) {
    const { selectedCell } = this.state;
    if (applyToBlock && selectedCell) {
      const { col, row } = selectedCell;
      const selection: CellSelection = {
        x1: col + 1,
        x2: col + 1,
        y1: row + 1,
        y2: row + 1,
      };
      const selectedBlock = utils.checkSelectedAnnotationBlocks(selection);
      if (selectedBlock) {
        wikiStore.table.selection.selectedBlock = selectedBlock;
      }
    } else {
      wikiStore.table.selection.selectedBlock = undefined;
    }
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

  async handleOnSubmit(qnode: QNode, applyToBlock?: boolean) {
    console.log('WikifyMenu OnSubmit triggered for -> ', qnode);

    let hasError = false;

    wikiStore.table.showSpinner = true;
    wikiStore.partialCsv.showSpinner = true;
    wikiStore.yaml.showSpinner = true;

    const { selectedCell } = this.state;
    if (!selectedCell) { return; }
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
          value: selectedCell.value,
          selection,
          qnode,
        })
      ));
    } catch (error) {
      error.errorDescription = `Wasn't able to submit the qnode!\n` + error.errorDescription;
      console.log(error.errorDescription)
      this.setState({ errorMessage: error });
      hasError = true;
    } finally {
      wikiStore.table.showSpinner = false;
      wikiStore.partialCsv.showSpinner = false;
      wikiStore.yaml.showSpinner = false;
    }

    //also update results:
    if (!hasError) {
      try {
        wikiStore.output.showSpinner = true;
        await this.requestService.call(this, () => this.requestService.getMappingCalculation())
      }
      catch (error) {
        console.log(error) //don't break on this
      }
      finally {
        wikiStore.output.showSpinner = false;
      }
      wikiStore.partialCsv.showSpinner = true;
      try {
        await this.requestService.getPartialCsv();
      }
      finally {
        wikiStore.partialCsv.showSpinner = false;
      }
    }
  }

  async handleOnRemove(qnode: QNode, applyToBlock: boolean) {
    console.log('WikifyMenu OnRemove triggered for -> ', qnode);

    wikiStore.table.showSpinner = true;
    wikiStore.partialCsv.showSpinner = true;
    wikiStore.yaml.showSpinner = true;

    const { selectedCell } = this.state;
    if (!selectedCell) { return; }

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
        this.requestService.removeQNodes({
          value: selectedCell.value,
          selection,
          qnode,
        })
      ));
    } catch (error) {
      error.errorDescription += `Wasn't able to submit the qnode!\n` + error.errorDescription;
      console.log(error.errorDescription)
      this.setState({ errorMessage: error });
    } finally {
      wikiStore.table.showSpinner = false;
      wikiStore.partialCsv.showSpinner = false;
      wikiStore.yaml.showSpinner = false;
    }
  }

  async handleOnCreateQnode(entityFields: EntityFields, applyToBlock?: boolean) {
    console.log('WikifyMenu handleOnCreateQnode triggered for -> ', entityFields);

    wikiStore.table.showSpinner = true;
    wikiStore.partialCsv.showSpinner = true;
    wikiStore.yaml.showSpinner = true;

    const { selectedCell } = this.state;
    if (!selectedCell) { return; }
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
        this.requestService.createQnodes(entityFields, selection, selectedCell.value,)
      ));
    } catch (error) {
      error.errorDescription = `Wasn't able to create the qnode!\n` + error.errorDescription;
      console.log(error.errorDescription)
      this.setState({ errorMessage: error });
    } finally {
      wikiStore.table.showSpinner = false;
      wikiStore.partialCsv.showSpinner = false;
      wikiStore.yaml.showSpinner = false;
    }

    //also update results:
    try {
      wikiStore.output.showSpinner = true;
      await this.requestService.call(this, () => this.requestService.getMappingCalculation())
    }
    catch (error) {
      console.log(error) //don't break on this
    }
    finally {
      wikiStore.output.showSpinner = false;
    }
    wikiStore.partialCsv.showSpinner = true;
    try {
      await this.requestService.getPartialCsv();
    }
    finally {
      wikiStore.partialCsv.showSpinner = false;
    }
  }

  renderHeader() {
    const { selectedCell } = this.state;
    if (!selectedCell) { return null; }
    const { col, row } = selectedCell;
    return (
      <div className="header">
        <strong className="mr-auto">
          Selected: {selectedCell ?
            utils.columnToLetter(col + 1) + (row + 1)
            : ""
          }
        </strong>
      </div>
    )
  }

  renderWikifyForms() {
    const { selectedCell } = this.state;
    if (!selectedCell) { return; }
    return (
      <Form className="container">
        <WikifyForm key={selectedCell.row.toString() + selectedCell.col.toString()}
          selectedCell={selectedCell}
          onSelectBlock={(applyToBlock) => this.onSelectBlock(applyToBlock)}
          onChange={this.handleOnChange.bind(this)}
          onSubmit={this.handleOnSubmit.bind(this)}
          onRemove={this.handleOnRemove.bind(this)}
          onCreateQnode={this.handleOnCreateQnode.bind(this)} />
      </Form>
    )
  }

  render() {
    const { selectedCell } = this.state;
    if (!selectedCell) { return <div>Please select a cell</div> }
    return (
      <Card className="wikify-menu">
        {this.renderHeader()}
        <Card.Body className="body">
          {this.state.errorMessage.errorDescription ? <ToastMessage message={this.state.errorMessage} /> : null}
          {this.renderWikifyForms()}
        </Card.Body>
      </Card>
    )
  }
}

export default WikifyMenu
