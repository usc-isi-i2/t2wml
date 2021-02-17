import React from 'react';

import { IReactionDisposer, reaction } from 'mobx';
import { Button, Col, Form, Row } from 'react-bootstrap';
import wikiStore from '../../../data/store';
import { Cell } from '../../../common/general';
import { QNode } from '@/renderer/common/dtos';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faTimes } from '@fortawesome/free-solid-svg-icons'


interface WikifyFormProperties {
  selectedCell: Cell;
  onChange: any | null; // Use the actual function type: (arg: argType) => returnType
  onSubmit: any | null;
}


interface WikifyFormState {
  search?: string;
  instanceOfSearch?: string;
  selected?: QNode;
  qnodes: QNode[];
}


class WikifyForm extends React.Component<WikifyFormProperties, WikifyFormState> {

  constructor(props: WikifyFormProperties) {
    super(props);

    this.state = {
      search: undefined,
      instanceOfSearch: undefined,
      selected: undefined,
      qnodes: [],
    };
  }

  private disposers: IReactionDisposer[] = [];

  componentDidMount() {
    this.disposers.push(reaction(() => wikiStore.wikifyQnodes.qnodes, (qnodes) => this.updateQNodes(qnodes)));

    const { selectedCell } = this.props;
    const qnode = wikiStore.layers.qnode.find(selectedCell);
    if ( qnode ) {
      this.setState({selected: qnode});
    }
  }

  componentWillUnmount() {
    for (const disposer of this.disposers) {
      disposer();
    }
  }

  updateQNodes(qnodes: QNode[]) {
    this.setState({qnodes});
  }

  handleOnChangeSearch(event: any) {
    const value: string = (event.target as HTMLInputElement).value;
    this.setState({search: value}, () => {
      if ( !value ) {
        this.clearSearch();
      } else {
       this.props.onChange(key, value);
      }
    });
  }

  handleOnSubmit(event: any) {
    event.preventDefault();
    const { onSubmit } = this.props;
    const { selected } = this.state;
    onSubmit({qnode: selected});
  }

  handleOnClick(qnode: QNode) {
    this.setState({selected: qnode, qnodes: []});
  }

  clearSearch() {
    this.setState({
      search: undefined,
      qnodes: [],
    });
  }

  renderSearchInputs() {
    const { search, instanceOfSearch, qnodes } = this.state;
    return (
      <Form.Group as={Row}>
        <Col sm="12" md="8">
          <Form.Label className="text-muted">Search</Form.Label>
          <Form.Control
            type="text" size="sm"
            placeholder="qnode"
            value={search}
            onChange={(event: any) => this.handleOnChangeSearch(event)} />
            {search || qnodes.length ? (
              <FontAwesomeIcon
                icon={faTimes}
                className="clear-button"
                onClick={this.clearSearch.bind(this)} />
            ) : null}
        </Col>
        <Col sm="12" md="4">
          <Form.Label className="text-muted">Instance Of</Form.Label>
          <Form.Control
            type="text" size="sm"
            placeholder="qnode"
            value={instanceOfSearch}
            onChange={(event: any) => {
              this.handleOnChange(event, 'instanceOfSearch')
            }} />
        </Col>
      </Form.Group>
    )
  }

  renderQNodeResults() {
    const { qnodes } = this.state;
    return qnodes.map((item, index) => (
      <Row className={"qnode"} key={index}
        onClick={() => this.handleOnClick(item)}>
        <Col sm="12" md="12">
          <div className="label">{item.label} ({item.id})</div>
          <div className="description">{item.description}</div>
        </Col>
      </Row>
    ));
  }

  renderSelectedNode() {
    const { selected, qnodes } = this.state;
    if ( qnodes.length ) {
      return (
        <div className="results">
          {this.renderQNodeResults()}
        </div>
      )
    }
    if ( selected ) {
      return (
        <div className="selected-node">
          <strong>{selected.label}</strong>&nbsp;
          <a target="_blank"
            rel="noopener noreferrer"
            className="type-qnode"
            href={`https://www.wikidata.org/wiki/${selected.id}`}>
            {selected.id}
          </a>
          <br />
          {selected.description}
        </div>
      )
    }
  }

  renderApplyOptions() {
    return (
      <Form.Group as={Row} className="apply-options">
        <Col sm="12" md="12">
          <input id="check-block" type="checkbox" defaultChecked={false} />
          <Form.Label htmlFor="check-block" className="text-muted">Apply to block</Form.Label>
        </Col>
      </Form.Group>
    )
  }

  renderSubmitButton() {
    return (
      <Form.Group as={Row}>
        <Col sm="12" md="12">
          <Button
            size="sm"
            type="submit"
            variant="outline-dark">
            Submit
          </Button>
        </Col>
      </Form.Group>
    )
  }

  render() {
    return (
      <Form className="container wikify-form"
        onSubmit={(event: any) => this.handleOnSubmit(event)}>
        {this.renderSearchInputs()}
        {this.renderSelectedNode()}
        {this.renderApplyOptions()}
        {this.renderSubmitButton()}
      </Form>
    )
  }
}


export default WikifyForm;
