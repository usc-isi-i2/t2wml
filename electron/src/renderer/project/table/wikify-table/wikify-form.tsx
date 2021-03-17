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
  onSelectBlock: (applyToBlock: boolean) => void;
  onChange: any | null; // Use the actual function type: (arg: argType) => returnType
  onSubmit: any | null;
  onRemove: any | null;
}


interface WikifyFormState {
  search?: string;
  instanceOf?: QNode;
  instanceOfSearch?: string;
  searchProperties: boolean;
  applyToBlock: boolean;
  selected?: QNode;
  qnodes: QNode[];
}


class WikifyForm extends React.Component<WikifyFormProperties, WikifyFormState> {

  private timeoutId?: number;

  constructor(props: WikifyFormProperties) {
    super(props);

    this.state = {
      search: undefined,
      instanceOf: undefined,
      instanceOfSearch: undefined,
      searchProperties: false,
      applyToBlock: false,
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

  toggleApplyToBlock() {
    const { applyToBlock } = this.state;
    this.props.onSelectBlock(!applyToBlock);
    this.setState({applyToBlock: !applyToBlock});
  }

  toggleSearchProperties() {
    const { searchProperties } = this.state;
    this.setState({searchProperties: !searchProperties});
  }

  updateQNodes(qnodes: QNode[]) {
    this.setState({qnodes});
  }

  handleOnFocusSearch() {
    const { search, instanceOf, searchProperties } = this.state;
    this.props.onChange('search', search, instanceOf, searchProperties);
  }

  handleOnChangeSearch(event: any) {
    const { instanceOf, searchProperties } = this.state;
    const value: string = (event.target as HTMLInputElement).value;

    this.setState({search: value}, () => {
      if ( !value ) {
        this.clearSearch();
      } else {
        if (this.timeoutId) {
          window.clearTimeout(this.timeoutId);
        }
        this.timeoutId = window.setTimeout(() => {
          this.props.onChange('search', value, instanceOf, searchProperties);
        }, 300);
      }
    });
  }

  handleOnChangeInstanceOfSearch(event: any) {
    const value: string = (event.target as HTMLInputElement).value;
    this.setState({instanceOfSearch: value}, () => {
      if ( !value ) {
        this.clearInstanceOfSearch();
      } else {
        if (this.timeoutId) {
          window.clearTimeout(this.timeoutId);
        }
        this.timeoutId = window.setTimeout(() => {
          this.props.onChange('instanceOfSearch', value);
        }, 300);
      }
    });
  }

  handleOnSubmit(event: any) {
    event.preventDefault();
    const { onSubmit } = this.props;
    const { selected, applyToBlock } = this.state;
    onSubmit(selected, applyToBlock);
  }

  handleOnRemove() {
    const { onRemove } = this.props;
    const { selected, applyToBlock } = this.state;
    onRemove(selected, applyToBlock);
  }

  handleOnClick(qnode: QNode) {
    const { instanceOfSearch } = this.state;
    if ( instanceOfSearch ) {
      this.setState({
        instanceOfSearch: '',
        instanceOf: qnode,
        qnodes: [],
      });
    } else {
      this.setState({
        selected: qnode,
        qnodes: [],
      });
    }
  }

  clearSearch() {
    this.setState({
      search: '',
      qnodes: [],
    });
  }

  clearInstanceOfSearch() {
    this.setState({
      instanceOfSearch: '',
      qnodes: [],
    });
  }

  removeInstanceOf() {
    const { search } = this.state;
    this.setState({
      instanceOf: undefined,
    }, () => {
      this.props.onChange('search', search);
    });
  }

  renderSearchInputs() {
    const { search, instanceOfSearch, qnodes, searchProperties } = this.state;
    return (
      <Form.Group as={Row}>
        <Col sm="12" className="search-properties">
          <input id="check-property-search"
            type="checkbox"
            defaultChecked={searchProperties}
            onChange={this.toggleSearchProperties.bind(this)} />
          <Form.Label
            htmlFor="check-property-search"
            className="text-muted">
            Search Properties
          </Form.Label>
        </Col>
        <Col sm="12" md="8">
          <Form.Label className="text-muted">Search</Form.Label>
          <Form.Control
            type="text" size="sm"
            placeholder={searchProperties ? 'property' : 'qnode'}
            value={search}
            onFocus={this.handleOnFocusSearch.bind(this)}
            onChange={(event: any) => this.handleOnChangeSearch(event)} />
            {search && qnodes.length ? (
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
              this.handleOnChangeInstanceOfSearch(event)
            }} />
            {instanceOfSearch && qnodes.length ? (
              <FontAwesomeIcon
                icon={faTimes}
                className="clear-button"
                onClick={this.clearInstanceOfSearch.bind(this)} />
            ) : null}
        </Col>
      </Form.Group>
    )
  }

  renderResults() {
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

  renderQNodeResults() {
    const { qnodes } = this.state;
    if ( qnodes.length ) {
      return (
        <div className="results">
          {this.renderResults()}
        </div>
      )
    }
  }

  renderInstanceOf() {
    const { instanceOf } = this.state;
    if ( instanceOf ) {
      return (
        <div className="instance-of">
          Results shown are limited to instances of <strong>{instanceOf.label} ({instanceOf.id})</strong>
          <span className="remove-instance-of-button"
            onClick={this.removeInstanceOf.bind(this)}>Remove</span>
        </div>
      )
    }
  }

  renderSelectedNode() {
    const { qnodes, selected } = this.state;
    if ( !qnodes.length && selected ) {
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
    const { qnodes, applyToBlock } = this.state;
    if ( !qnodes.length ) {
      return (
        <Form.Group as={Row} className="apply-options">
          <Col sm="12" md="12">
            <input id="check-block"
              type="checkbox"
              defaultChecked={applyToBlock}
              onChange={this.toggleApplyToBlock.bind(this)} />
            <Form.Label htmlFor="check-block" className="text-muted">Apply to block</Form.Label>
          </Col>
        </Form.Group>
      )
    }
  }

  renderSubmitButton() {
    const { qnodes } = this.state;
    if ( !qnodes.length ) {
      return (
        <Form.Group as={Row}>
          <Col sm="12" md="12">
            <Button
              size="sm"
              type="submit"
              variant="outline-dark">
              Submit
            </Button>
            {this.renderRemoveButton()}
          </Col>
        </Form.Group>
      )
    }
  }

  renderRemoveButton() {
    const { qnodes } = this.state;
    if ( !qnodes.length ) {
      return (
        <Button
          size="sm"
          type="button"
          variant="link"
          className="delete"
          onClick={this.handleOnRemove.bind(this)}>
          remove wikification
        </Button>
      )
    }
  }

  render() {
    return (
      <Form className="container wikify-form"
        onSubmit={(event: any) => this.handleOnSubmit(event)}>
        {this.renderSearchInputs()}
        {this.renderInstanceOf()}
        {this.renderQNodeResults()}
        {this.renderSelectedNode()}
        {this.renderApplyOptions()}
        {this.renderSubmitButton()}
      </Form>
    )
  }
}


export default WikifyForm;
