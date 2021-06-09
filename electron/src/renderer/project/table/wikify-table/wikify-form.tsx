import React from 'react';

import { IReactionDisposer, reaction } from 'mobx';
import { Button, Col, Form, Row } from 'react-bootstrap';
import wikiStore, { Layer } from '../../../data/store';
import { Cell } from '../../../common/general';
import { EntityFields, QNode, QNodeEntry } from '@/renderer/common/dtos';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faTimes } from '@fortawesome/free-solid-svg-icons'
import EntityForm from '../entity-form';
import { isValidLabel } from '../table-utils';


interface WikifyFormProperties {
  selectedCell: Cell;
  onSelectBlock: (applyToBlock: boolean) => void;
  onChange: (key: string, value?: string, instanceOf?: QNode | undefined, searchProperties?: boolean) => Promise<void>;
  onSubmit: (qnode: QNode, applyToBlock: boolean) => Promise<void>;
  onRemove: (qnode: QNode, applyToBlock: boolean) => Promise<void>;
  onCreateQnode: (entityFields: EntityFields, applyToBlock: boolean) => Promise<void>;
}

interface WikifyFormState {
  search?: string;
  instanceOf?: QNode;
  instanceOfSearch?: string;
  applyToBlock: boolean;
  selected?: QNode;
  qnodes: QNode[];
  prevCell?: Cell;
  entityFields: EntityFields;
  customQnode: boolean;
}



class WikifyForm extends React.Component<WikifyFormProperties, WikifyFormState> {

  private timeoutId?: number;
  // private timeoutIdCreateQnode?: number;
  private disposers: IReactionDisposer[] = [];

  constructor(props: WikifyFormProperties) {
    super(props);

    const { selectedCell } = this.props;
    const selected = wikiStore.layers.qnode.find(selectedCell);

    const entityFields = {
      is_property: false,
      label: selectedCell.value ? selectedCell.value : "",
      description: "",
      data_type: "string",
    }

    entityFields.is_property = wikiStore.table.selectedBlock?.role === 'property'? true : false;
    
    let customQnode = false;
    if (selected && isValidLabel(selected.label) && isValidLabel(selected.id.substring(1, selected.id.length))) {
      entityFields.is_property = selected.id.startsWith("P");
      entityFields.description = selected.description;
      entityFields.label = selected.label;
      customQnode = true;
    }
    this.state = {
      search: undefined,
      instanceOf: undefined,
      instanceOfSearch: undefined,
      applyToBlock: false,
      selected: selected,
      qnodes: [],
      prevCell: undefined,
      entityFields: entityFields,
      customQnode: customQnode
    };
  }

  componentDidMount() {
    this.disposers.push(reaction(() => wikiStore.wikifyQnodes.qnodes, (qnodes) => this.updateQNodes(qnodes)));
    this.disposers.push(reaction(() => wikiStore.layers.qnode, (qnodes) => this.onChangeQnodes(qnodes)));
  }

  componentWillUnmount() {
    for (const disposer of this.disposers) {
      disposer();
    }
  }

  onChangeQnodes(qnodes: Layer<QNodeEntry>){
    const { entityFields } = this.state;
    const selected = qnodes.find(this.props.selectedCell);
    let customQnode = false;
    if (selected && isValidLabel(selected.label) && isValidLabel(selected.id.substring(1, selected.id.length))) {
      entityFields.is_property = selected.id.startsWith("P");
      entityFields.description = selected.description;
      entityFields.label = selected.label;
      customQnode = true;
    }
    this.setState({ customQnode, entityFields, selected })
  }


  toggleApplyToBlock() {
    const { applyToBlock } = this.state;
    this.props.onSelectBlock(!applyToBlock);
    this.setState({ applyToBlock: !applyToBlock });
  }

  updateQNodes(qnodes: QNode[]) {
    this.setState({ qnodes });
  }

  handleOnFocusSearch() {
    const { search, instanceOf, entityFields } = this.state;
    this.props.onChange('search', search, instanceOf, entityFields.is_property);
  }

  handleOnChangeSearch(event: any) {
    const { instanceOf, entityFields } = this.state;
    const value: string = (event.target as HTMLInputElement).value;

    this.setState({ search: value }, () => {
      if (!value) {
        this.clearSearch();
      } else {
        if (this.timeoutId) {
          window.clearTimeout(this.timeoutId);
        }
        this.timeoutId = window.setTimeout(() => {
          this.props.onChange('search', value, instanceOf, entityFields.is_property);
        }, 300);
      }
    });
  }

  handleOnChangeInstanceOfSearch(event: any) {
    const value: string = (event.target as HTMLInputElement).value;
    this.setState({ instanceOfSearch: value }, () => {
      if (!value) {
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

  handleOnSubmit(event?: any) {
    event?.preventDefault();
    const { onSubmit, onCreateQnode } = this.props;
    const { selected, applyToBlock, customQnode, entityFields } = this.state;
    if (customQnode && isValidLabel(entityFields.label)) {
      onCreateQnode(entityFields, applyToBlock);
      return;
    }
    if (!selected) { return; }
    onSubmit(selected, applyToBlock);
  }

  handleOnRemove() {
    const { onRemove, selectedCell } = this.props;
    const { selected, applyToBlock } = this.state;
    if (!selected) { return; }
    onRemove(selected, applyToBlock);
    this.setState({
      selected: undefined,
      instanceOf: undefined,
      search: '',
      instanceOfSearch: '',
      qnodes: [],
      entityFields: {
        is_property: true,
        label: selectedCell.value || "",
        description: "",
        data_type: "quantity",
      },
      customQnode: false
    });
  }

  handleOnClick(qnode: QNode) {
    const { instanceOfSearch } = this.state;
    if (instanceOfSearch) {
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
    const {
      qnodes,
      search,
      instanceOfSearch,
      customQnode,
      entityFields
    } = this.state;
    return (
      <Form.Group as={Row} style={{ marginTop: "1rem" }}>
        <Col sm="12" md='12'>
          <Form.Label className="text-muted">Search</Form.Label>
          <Form.Control
            type="text" size="sm"
            placeholder={entityFields.is_property ? 'property' : 'node'}
            value={search}
            onFocus={this.handleOnFocusSearch.bind(this)}
            onChange={(event: any) => this.handleOnChangeSearch(event)}
            disabled={customQnode} />
          {search && qnodes.length ? (
            <FontAwesomeIcon
              icon={faTimes}
              className="clear-button"
              onClick={this.clearSearch.bind(this)} />
          ) : null}
        </Col>
        {!entityFields.is_property && (
          <Col sm="12" md="12">
            <Form.Label className="text-muted">Instance Of</Form.Label>
            <Form.Control
              type="text" size="sm"
              placeholder="node"
              value={instanceOfSearch}
              onChange={(event: any) => { this.handleOnChangeInstanceOfSearch(event) }}
              disabled={customQnode} />
            {instanceOfSearch && qnodes.length ? (
              <FontAwesomeIcon
                icon={faTimes}
                className="clear-button"
                onClick={this.clearInstanceOfSearch.bind(this)} />
            ) : null}
          </Col>
        )}
      </Form.Group>
    )
  }

  renderQNodeResults() {
    const { qnodes } = this.state;
    if (qnodes.length) {
      return (
        <div className="results">
          {qnodes.map((item, index) => (
            <Row className={"qnode"} key={index}
              onClick={() => this.handleOnClick(item)}>
              <Col sm="12" md="12">
                <div className="label">{item.label} ({item.id})</div>
                <div className="description">{item.description}</div>
              </Col>
            </Row>
          ))}
        </div>
      )
    }
  }

  renderInstanceOf() {
    const { instanceOf } = this.state;
    if (instanceOf) {
      return (
        <div className="instance-of">
          Results shown are limited to instances of <strong>{instanceOf.label} ({instanceOf.id})</strong>
          <span className="remove-instance-of-button"
            onClick={this.removeInstanceOf.bind(this)}>Remove</span>
        </div>
      )
    } else { return null; }
  }

  renderSelectedNode() {
    const { qnodes, selected } = this.state;

    if (!qnodes.length && selected) {
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
    } else { return null; }
  }

  renderApplyOptions() {
    const { qnodes, applyToBlock } = this.state;
    if (!qnodes.length) {
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

  renderEntityForm() {
    const { entityFields, customQnode } = this.state;
    return (
      <EntityForm isReadOnly={!customQnode}
        entityFields={entityFields}
        handleOnChange={(event: KeyboardEvent, key: "label" | "description" | "data_type" | "is_property") => this.handleOnChangeEntity(event, key)}
      />
    );
  }

  handleOnChangeEntity(event: KeyboardEvent, key: "label" | "description" | "data_type" | "is_property") {
    const value = (event.target as HTMLInputElement).value;
    const updatedEntityFields = { ...this.state.entityFields };
    switch (key) {
      case "is_property": {
        updatedEntityFields.is_property = !updatedEntityFields.is_property
        break;
      }
      case "description": {
        updatedEntityFields.description = value;
        break;
      }
      case "data_type": {
        updatedEntityFields.data_type = value;
        break;
      }
      case "label": {
        updatedEntityFields.label = value;
        break;
      }
      default: {
        break;
      }
    }
    this.setState({ entityFields: updatedEntityFields });
    // , () => {
    //   const { entityFields, customQnode } = this.state;
    //   if (entityFields.label && customQnode) {
    //     if (this.timeoutIdCreateQnode) {
    //       window.clearTimeout(this.timeoutIdCreateQnode);
    //     }
    //     this.timeoutIdCreateQnode = window.setTimeout(() => {
    //       if (isValidLabel(entityFields.label)) {
    //         this.handleOnSubmit()
    //       }
    //     }, 300);
    //   }
    // });
  }

  onChangeCustomQnode() {
    const { selected, entityFields, customQnode } = this.state;
    this.setState({ customQnode: !customQnode, qnodes: [] });
    if (selected && customQnode) {
      if (isValidLabel(selected.label) && isValidLabel(selected.id.substring(1, selected.id.length))) {
        entityFields.is_property = selected.id.startsWith("P");
        entityFields.description = selected.description;
        entityFields.label = selected.label;
      }
    }
    this.setState({ entityFields })
  }

  renderSubmitButton() {
    const { qnodes, selected, customQnode, entityFields } = this.state;
    if (!qnodes.length) {
      return (
        <Form.Group as={Row}>
          <Col sm="12" md="12">
            <Button
              size="sm"
              type="submit"
              variant="outline-dark"
              disabled={!(selected || (customQnode && isValidLabel(entityFields.label)))}>
              Submit
            </Button>
            {this.renderRemoveButton()}
          </Col>
        </Form.Group>
      )
    }
  }

  renderRemoveButton() {
    const { qnodes, selected } = this.state;
    if (!qnodes.length && selected) {
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
    const { customQnode, entityFields } = this.state;
    return (
      <Form className="container wikify-form"
        onSubmit={(event: any) => this.handleOnSubmit(event)}>
        <Form.Group as={Row} style={{ marginTop: "1rem" }}>
          <Form.Check type="checkbox" inline  label="Custom?" defaultChecked={customQnode} onChange={() => this.onChangeCustomQnode()} />
        </Form.Group>
        <Form.Group as={Row} style={{ marginTop: "1rem" }} className="search-properties"
        onChange={(event: KeyboardEvent) => this.handleOnChangeEntity(event, "is_property")}>
          <Form.Check id="check-property-search" type="checkbox" inline  label="Is property?" defaultChecked={entityFields.is_property} 
            disabled={wikiStore.table.selectedBlock?.role ? true : false}/>
        </Form.Group>
        <Form.Group as={Row}>
          <Col sm="5" md="5">
            {this.renderSearchInputs()}
            {this.renderInstanceOf()}
            {this.renderQNodeResults()}
          </Col>
          <Col sm="5" md="5" style={{ marginLeft: "1rem" }}>
            {this.renderEntityForm()}
          </Col>
        </Form.Group>
        {this.renderSelectedNode()}
        {this.renderApplyOptions()}
        {this.renderSubmitButton()}
      </Form>
    )
  }
}

export default WikifyForm;
