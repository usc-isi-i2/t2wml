import React from 'react';

import { IReactionDisposer, reaction } from 'mobx';
import { Button, Col, Form, Row } from 'react-bootstrap';
import wikiStore, { Layer } from '../../data/store';
import { Cell, CellSelection } from '../../common/general';
import { AnnotationBlock, EntityFields, QNode, QNodeEntry } from '@/renderer/common/dtos';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faTimes } from '@fortawesome/free-solid-svg-icons'

import CustomNodeForm from './custom-node-form';
import { isValidLabel, checkSelectedAnnotationBlocks } from '../table/table-utils';

interface WikifyFormProperties {
  selectedCell: Cell;
  onSelectBlock?: (applyToBlock: boolean) => void;
  onChange: (key: string, value?: string, instanceOf?: QNode | undefined, searchProperties?: boolean) => Promise<void>;
  onSubmit: (qnode: QNode, applyToBlock?: boolean) => Promise<void>;
  onRemove?: (qnode: QNode, applyToBlock: boolean) => Promise<void>;
  onCreateQnode: (entityFields: EntityFields, applyToBlock?: boolean) => Promise<void>;
  field?: string;
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
  disabledIsProperty: boolean;
  disableDataType: boolean;
}



class WikifyForm extends React.Component<WikifyFormProperties, WikifyFormState> {

  private timeoutId?: number;
  // private timeoutIdCreateQnode?: number;
  private disposers: IReactionDisposer[] = [];

  constructor(props: WikifyFormProperties) {
    super(props);

    const { selectedCell, field } = this.props;
    const selected = field ? undefined : wikiStore.layers.qnode.find(selectedCell);

    const entityFields = {
      is_property: false,
      label: selectedCell.value && !field ? selectedCell.value : "",
      description: "",
      data_type: "string",
    }

    entityFields.is_property = field ? field === "property" : (wikiStore.table.selection.selectedBlock?.role === 'property' ? true : false);
    entityFields.data_type = wikiStore.table.selection.selectedBlock?.type ? wikiStore.table.selection.selectedBlock?.type : "string";

    let customQnode = false;
    if (selected && isValidLabel(selected.label) && isValidLabel(selected.id.substring(1, selected.id.length))) {
      entityFields.is_property = selected.id.startsWith("P");
      entityFields.description = selected.description;
      entityFields.label = selected.label;
      customQnode = true;
      if (selected.data_type && entityFields.is_property) {
        entityFields.data_type = selected.data_type.toString();
      }
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
      customQnode: customQnode,
      disabledIsProperty: wikiStore.table.selection.selectedBlock?.role ? true : false,
      disableDataType: wikiStore.table.selection.selectedBlock?.type ? true : false
    };
  }

  componentDidMount() {
    this.disposers.push(reaction(() => wikiStore.wikifyQnodes.qnodes, (qnodes) => this.updateQNodes(qnodes)));
    this.disposers.push(reaction(() => wikiStore.layers.qnode, (qnodes) => this.onChangeQnodes(qnodes)));
    this.disposers.push(reaction(() => wikiStore.table.selection.selectedBlock, (selectedBlock) => this.onChangeRole(selectedBlock)));

  }

  componentWillUnmount() {
    for (const disposer of this.disposers) {
      disposer();
    }
  }

  onChangeQnodes(qnodes: Layer<QNodeEntry>) {
    const { entityFields } = this.state;
    const { field } = this.props;
    const selected = field ? undefined : qnodes.find(this.props.selectedCell);
    let customQnode = false;
    if (selected && isValidLabel(selected.label) && isValidLabel(selected.id.substring(1, selected.id.length))) {
      entityFields.is_property = selected.id.startsWith("P");
      entityFields.description = selected.description;
      entityFields.label = selected.label;
      customQnode = true;
      if (selected.data_type && entityFields.is_property) {
        entityFields.data_type = selected.data_type.toString();
      }
    }
    this.setState({ customQnode, entityFields, selected })
  }

  onChangeRole(selectedBlock?: AnnotationBlock) {
    if (selectedBlock) {
      this.setState({ disabledIsProperty: selectedBlock?.role ? true : false, disableDataType: selectedBlock?.type ? true : false })
    } else {
      const { selectedCell } = this.props;
      const { col, row } = selectedCell;
      const selection: CellSelection = {
        x1: col + 1,
        x2: col + 1,
        y1: row + 1,
        y2: row + 1,
      };
      const blockOfCell = checkSelectedAnnotationBlocks(selection);
      this.setState({ disabledIsProperty: blockOfCell?.role ? true : false, disableDataType: blockOfCell?.type ? true : false })
    }
  }


  toggleApplyToBlock() {
    const { applyToBlock } = this.state;
    const { onSelectBlock } = this.props;
    if (onSelectBlock) onSelectBlock(!applyToBlock);
    this.setState({ applyToBlock: !applyToBlock });
  }

  updateQNodes(qnodes: QNode[]) {
    this.setState({ qnodes });
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
    const { onRemove, selectedCell, field } = this.props;
    const { selected, applyToBlock } = this.state;
    if (!selected) { return; }
    if (onRemove) onRemove(selected, applyToBlock);
    this.setState({
      selected: undefined,
      instanceOf: undefined,
      search: '',
      instanceOfSearch: '',
      qnodes: [],
      entityFields: {
        is_property: field ? field === "property" : (wikiStore.table.selection.selectedBlock?.role === 'property' ? true : false),
        label: selectedCell.value || "",
        description: "",
        data_type: wikiStore.table.selection.selectedBlock?.type ? wikiStore.table.selection.selectedBlock?.type : "string"
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
    if (!customQnode) {
      return (
        <Form.Group as={Row} style={{ marginTop: "1rem" }}>
          <Col sm="12" md='12'>
            <Form.Label className="text-muted">Search</Form.Label>
            <Form.Control
              type="text" size="sm"
              placeholder={entityFields.is_property ? 'property' : 'node'}
              value={search}
              // onFocus={this.handleOnFocusSearch.bind(this)}
              onChange={(event: any) => this.handleOnChangeSearch(event)}
              disabled={customQnode} />
            {search && qnodes.length ? (
              <FontAwesomeIcon
                icon={faTimes}
                className="clear-button"
                onClick={this.clearSearch.bind(this)} />
            ) : null}
          </Col>
          {
            !entityFields.is_property ? (
              <Col sm="12" md="12">
                <Form.Label className="text-muted">Instance Of</Form.Label>
                <Form.Control
                  type="text" size="sm"
                  placeholder="node"
                  value={instanceOfSearch}
                  onChange={(event: any) => { this.handleOnChangeInstanceOfSearch(event) }}
                  disabled={customQnode} />
                {
                  instanceOfSearch && qnodes.length ? (
                    <FontAwesomeIcon
                      icon={faTimes}
                      className="clear-button"
                      onClick={this.clearInstanceOfSearch.bind(this)} />
                  )
                    : null
                }
              </Col>
            ) : null
        }
        </Form.Group>
      )
    }
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
              checked={applyToBlock}
              onChange={this.toggleApplyToBlock.bind(this)} />
            <Form.Label htmlFor="check-block" className="text-muted">Apply to block</Form.Label>
          </Col>
        </Form.Group>
      )
    }
  }

  renderCustomNodeForm() {
    const { entityFields, customQnode, disableDataType } = this.state;
    if (customQnode) {
      return (
        <Col sm="12" md="12">
          <CustomNodeForm
            disableDataType={disableDataType}
            entityFields={entityFields}
            handleOnChange={(event: KeyboardEvent, key: "label" | "description" | "data_type" | "is_property") => this.handleOnChangeEntity(event, key)}
          />
        </Col>
      );
    }

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
  }

  onChangeCustomQnode() {
    const { selected, entityFields, customQnode } = this.state;
    if (selected && !customQnode) {
      if (isValidLabel(selected.label) && isValidLabel(selected.id.substring(1, selected.id.length))) {
        entityFields.is_property = selected.id.startsWith("P");
        entityFields.description = selected.description;
        entityFields.label = selected.label;
        if (selected.data_type && entityFields.is_property) {
          entityFields.data_type = selected.data_type.toString();
        }
      }
    }
    this.setState({ entityFields, customQnode: !customQnode, qnodes: [] })
  }

  renderSubmitButton() {
    const { qnodes, selected, customQnode, entityFields } = this.state;
    if (!qnodes.length) {
      return (
        <Form.Group as={Row}>
          <Col sm="12" md="12">
            <Button
              size="sm"
              type="button"
              variant="outline-dark"
              disabled={!(selected || (customQnode && isValidLabel(entityFields.label)))}
              onClick={(event) => this.handleOnSubmit(event)}
            >
              { this.props.field ? "OK" : "Submit" }
            </Button>
            { this.props.field ? null : this.renderRemoveButton() }
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
          variant="outline-danger"
          className="delete"
          onClick={this.handleOnRemove.bind(this)}>
          Remove Wikification
        </Button>
      )
    }
  }

  render() {
    const { customQnode, entityFields, disabledIsProperty } = this.state;
    const { field } = this.props;
    return (
      <div className="wikify-form">
        <Form.Group as={Row} style={{ marginTop: "1rem" }}>
          <Form.Check type="checkbox" inline label="Custom?" checked={customQnode} onChange={() => this.onChangeCustomQnode()} />
        </Form.Group>
        <Form.Group as={Row} style={{ marginTop: "1rem" }} className="search-properties"
          onChange={(event: KeyboardEvent) => this.handleOnChangeEntity(event, "is_property")}>
          <Form.Check id="check-property-search" type="checkbox" inline label="Is property?" defaultChecked={entityFields.is_property || field==="property"}
            disabled={disabledIsProperty || !!field} />
        </Form.Group>
        <Form.Group as={Row}>
          <Col sm="12" md="12">
            {customQnode ?
              this.renderCustomNodeForm()
              :
              this.renderSearchInputs()
            }
            {this.renderInstanceOf()}
            {this.renderQNodeResults()}
          </Col>
        </Form.Group>
        {this.renderSelectedNode()}
        {
          this.props.field ? null : this.renderApplyOptions()
        }
        {this.renderSubmitButton()}
      </div>
    )
  }
}

export default WikifyForm;
