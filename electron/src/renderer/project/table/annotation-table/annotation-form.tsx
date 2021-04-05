import React from 'react';

import { AnnotationBlock, AnnotationOption } from '../../../common/dtos';
import * as utils from '../table-utils';
import { ROLES } from './annotation-options';
import { Button, Col, Form, Row } from 'react-bootstrap';
import { CellSelection } from '@/renderer/common/general';
import SearchResults from './search-results';


interface AnnotationFormProperties {
  selection?: CellSelection;
  onSelectionChange: (selection: CellSelection) => void;
  selectedAnnotationBlock?: AnnotationBlock;
  onChange: any | null; // Use the actual function type: (arg: argType) => returnType
  onDelete: any | null;
  onSubmit: any | null;
}


interface AnnotationFormState {
  role?: string;
  type?: string;
  unit?: string;
  format?: string;
  calendar?: string;
  property?: string;
  language?: string;
  precision?: string;
  selectedArea?: string;
}


class AnnotationForm extends React.Component<AnnotationFormProperties, AnnotationFormState> {

  private changed: boolean;
  private timeoutId?: number;

  constructor(props: AnnotationFormProperties) {
    super(props);

    const { selectedAnnotationBlock: selectedBlock } = this.props;
    this.state = {
      ...selectedBlock,
      role: selectedBlock?.role,
      type: selectedBlock?.type,
      selectedArea: undefined,
    };
    this.changed = false;
  }

  handleOnChange(event: KeyboardEvent, key: string) {
    const { onSubmit } = this.props;
    if (event.code === 'Enter' ) {
      event.preventDefault();
      onSubmit(this.state);
    }

    const { onChange } = this.props;
    const value = (event.target as HTMLInputElement).value;
    const updatedState: AnnotationFormState = {};
    updatedState[key as keyof AnnotationFormState] = value;
    this.changed = true;

    // Reset the role if the type has changed
    if ( key === 'role' ) {
      updatedState['type'] = undefined;
    }

    this.setState({ ...updatedState }, () => {
      if ( this.timeoutId ) {
        window.clearTimeout(this.timeoutId);
      }
      this.timeoutId = window.setTimeout(() => {
        onChange(key, value);
      }, 300);
    });
  }

  handleOnSelectionChange(event: React.ChangeEvent) {
    const { onSelectionChange } = this.props;
    const value = (event.target as HTMLInputElement).value;
    this.setState({
      selectedArea: value,
    });
    const regex = /^.?([a-z]+)([0-9]+):([a-z]+)([0-9]+).?$/gmi;
    const groups = regex.exec(value);
    if ( groups && groups[1] && groups[2] && groups[3] && groups[4] ) {
      const selection: CellSelection = {
        x1: utils.letterToColumn(groups[1]),
        x2: utils.letterToColumn(groups[3]),
        y1: parseInt(groups[2]),
        y2: parseInt(groups[4]),
      };
      onSelectionChange(selection);
    }
  }

  handleOnSubmit(event: any) {
    event.preventDefault();
    const { onSubmit } = this.props;
    onSubmit(this.state);
  }

  handleOnDelete(event: React.MouseEvent) {
    event.preventDefault();
    this.props.onDelete();
  }

  renderSelectionAreas() {
    const { selectedArea } = this.state;
    const { selection } = this.props;
    if (!selection) { return null; }
    const defaultValue = utils.humanReadableSelection(selection);
    return (
      <Form.Group as={Row}>
        <Col sm="12" md="12">
          <Form.Label className="text-muted">Selected area</Form.Label>
          <Form.Control
            type="text" size="sm"
            value={selectedArea || defaultValue}
            onChange={(event: React.ChangeEvent) => this.handleOnSelectionChange(event)} />
        </Col>
      </Form.Group>
    )
  }

  renderNestedOptionsChildren(type: any) {
    const { selectedAnnotationBlock: selectedBlock } = this.props;

    const key: string = type.label.toLowerCase();

    let defaultValue = '';
    if ( selectedBlock && (selectedBlock as any)[type.value] ) {
      defaultValue = (selectedBlock as any)[type.value];
    }

    if ( type.children ) {
      return (
        <Form.Group as={Row} key={type.value}
          onChange={
            (event: KeyboardEvent) => this.handleOnChange(event, type.value)
          }>
          <Col sm="12" md="12">
            <Form.Label className="text-muted">Type</Form.Label>
            <Form.Control size="sm" as="select">
              {type.children.map((option: AnnotationOption) => (
                <option key={option.value}
                  value={option.value}
                  selected={option.value === defaultValue}>
                  {option.label}
                </option>
              ))}
            </Form.Control>
          </Col>
        </Form.Group>
      )
    }

    return (
      <Form.Group as={Row} key={type.value}
        onChange={(event: KeyboardEvent) => this.handleOnChange(event, type.value)}>
        <Col sm="12" md="12">
          <Form.Label className="text-muted">{type.label}</Form.Label>
          {this.state[key as keyof AnnotationFormState] ? (
            <Form.Control
              type="text" size="sm"
              value={this.state[key as keyof AnnotationFormState]}
              defaultValue={defaultValue} />
          ) : (
            <Form.Control
              type="text" size="sm"
              defaultValue={defaultValue} />
          )}
        </Col>
      </Form.Group>
    )
  }

  renderNestedOptions() {
    const { role, type } = this.state;
    const { selectedAnnotationBlock: selectedBlock } = this.props;
    const selectedAnnotationRole = selectedBlock && !this.changed ? selectedBlock.role : role;
    let selectedAnnotationType = selectedBlock && !this.changed ? selectedBlock.type : type;
    if (!selectedAnnotationType){
      //default to string:
      selectedAnnotationType="string";
    }
    let selectedOption = null;
    if (selectedAnnotationRole) {
      selectedOption = ROLES.find(option => (
        option.value === selectedAnnotationRole
      ));
    } else {
      selectedOption = ROLES.find(option => option.value === role);
    }
    if (!selectedOption || !('children' in selectedOption)) { return null; }
    const optionsDropdown = (
      <Form.Group as={Row}
        onChange={(event: KeyboardEvent) => this.handleOnChange(event, 'type')}>
        <Col sm="12" md="12">
          <Form.Label className="text-muted">Type</Form.Label>
          <Form.Control size="sm" as="select">
            {selectedOption?.children?.map((type, i) => (
              <option key={i}
                value={type.value}
                selected={type.value === selectedAnnotationType}>
                {type.label}
              </option>
            ))}
          </Form.Control>
        </Col>
      </Form.Group>
    )
    let selectedType = null;
    if (selectedAnnotationType) {
      selectedType = selectedOption?.children?.find(option => (
        option.value === selectedAnnotationType
      ));
    } else {
      selectedType = selectedOption?.children?.find(option => (
        option.value === type
      ));
    }
    if (!selectedType || !('children' in selectedType)) {
      return optionsDropdown;
    } else {
      return (
        <React.Fragment>
          {optionsDropdown}
          {selectedType?.children?.map(type => {
            return this.renderNestedOptionsChildren(type);
          })}
        </React.Fragment>
      )
    }
  }

  renderOptionsDropdown() {
    const { selectedAnnotationBlock: selected } = this.props;
    const selectedAnnotationRole = selected ? selected.role : '';

    return (
      <Form.Group as={Row}
        onChange={(event: KeyboardEvent) => this.handleOnChange(event, 'role')}>
        <Col sm="12" md="12">
          <Form.Label className="text-muted">Role</Form.Label>
          <Form.Control size="sm" as="select">
            <option disabled selected>--</option>
            {ROLES.map((role, i) => (
              <option key={i}
                value={role.value}
                selected={role.value === selectedAnnotationRole}>
                {role.label}
              </option>
            ))}
          </Form.Control>
        </Col>
      </Form.Group>
    )
  }

  handleOnSelect(key: string, value: string) {
    const updatedState: AnnotationFormState = {};
    updatedState[key as keyof AnnotationFormState] = value;
    this.setState({ ...updatedState });
  }

  renderSearchResults() {
    return (
      <SearchResults onSelect={this.handleOnSelect.bind(this)} />
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
          {this.renderDeleteButton()}
        </Col>
      </Form.Group>
    )
  }

  renderDeleteButton() {
    const { selectedAnnotationBlock: selectedBlock } = this.props;
    if (selectedBlock) {
      return (
        <Button
          size="sm"
          type="button"
          variant="link"
          className="delete"
          onClick={(event: React.MouseEvent) => this.handleOnDelete(event)}>
          delete this annotation block
        </Button>
      )
    }
  }

  render() {
    return (
      <Form className="container annotation-form"
        onSubmit={this.handleOnSubmit.bind(this)}>
        {this.renderSelectionAreas()}
        {this.renderOptionsDropdown()}
        {this.renderNestedOptions()}
        {this.renderSearchResults()}
        {this.renderSubmitButton()}
      </Form>
    )
  }
}


export default AnnotationForm;
