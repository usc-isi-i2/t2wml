import React from 'react';

import { AnnotationBlock } from '../../../common/dtos';
import * as utils from '../table-utils';
import { ROLES } from './annotation-options';
import { Button, Col, Form, Row } from 'react-bootstrap';
import { CellSelection } from '@/renderer/common/general';


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
}


class AnnotationForm extends React.Component<AnnotationFormProperties, AnnotationFormState> {

  private changed: boolean;

  constructor(props: AnnotationFormProperties) {
    super(props);

    const { selectedAnnotationBlock: selectedBlock } = this.props;
    this.state = {
      ...selectedBlock,
      role: selectedBlock?.role,
      type: selectedBlock?.type,
    };
    this.changed = false;
  }

  handleOnChange(event: any, key: string) {
    const { onChange } = this.props;
    const value = (event.target as HTMLInputElement).value;
    const updatedState: AnnotationFormState = {};
    updatedState[key as keyof AnnotationFormState] = value;
    this.changed = true;

    // Reset the role if the type has changed
    if ( key === 'role' ) {
      updatedState['type'] = undefined;
    }

    this.setState({ ...updatedState }, () => onChange(key, value));
  }

  handleOnSubmit(event: any) {
    event.preventDefault();
    const { onSubmit } = this.props;
    onSubmit(this.state);
  }

  handleOnDelete(event: any) {
    event.preventDefault();
    this.props.onDelete();
  }

  renderSelectionAreas() {
    const { selection } = this.props;
    if (!selection) { return null; }
    const defaultValue = utils.humanReadableSelection(selection);
    return (
      <Form.Group as={Row} onChange={(event: React.KeyboardEvent) => this.handleOnChange(event, 'area')}>
        <Col sm="12" md="12">
          <Form.Label className="text-muted">Selected area</Form.Label>
          <Form.Control
            type="text" size="sm"
            defaultValue={defaultValue} />
        </Col>
      </Form.Group>
    )
  }

  renderNestedOptionsChildren(type: any) {
    const { selectedAnnotationBlock: selectedBlock } = this.props;

    let defaultValue = '';
    if ( selectedBlock && (selectedBlock as any)[type.value] ) {
      defaultValue = (selectedBlock as any)[type.value];
    }

    return (
      <Form.Group as={Row} key={type.value}
        onChange={(event: React.KeyboardEvent) => this.handleOnChange(event, type.value)}>
        <Col sm="12" md="12">
          <Form.Label className="text-muted">{type.label}</Form.Label>
          <Form.Control
            type="text" size="sm"
            defaultValue={defaultValue} />
        </Col>
      </Form.Group>
    )
  }

  renderNestedOptions() {
    const { role, type } = this.state;
    const { selectedAnnotationBlock: selectedBlock } = this.props;
    const selectedAnnotationRole = selectedBlock && !this.changed ? selectedBlock.role : role;
    const selectedAnnotationType = selectedBlock && !this.changed ? selectedBlock.type : type;
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
        onChange={(event: React.KeyboardEvent) => this.handleOnChange(event, 'type')}>
        <Col sm="12" md="12">
          <Form.Label className="text-muted">Type</Form.Label>
          <Form.Control size="sm" as="select">
            <option disabled selected>--</option>
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
        onChange={(event: React.KeyboardEvent) => this.handleOnChange(event, 'role')}>
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

  renderDeleteButton() {
    const { selectedAnnotationBlock: selectedBlock } = this.props;
    if (selectedBlock) {
      return (
        <Form.Group as={Row}>
          <Col sm="12" md="12">
            <Button
              size="sm"
              type="button"
              variant="link"
              className="delete"
              onClick={(event) => this.handleOnDelete(event)}>
              delete this annotation block
            </Button>
          </Col>
        </Form.Group>
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
        {this.renderSubmitButton()}
        {this.renderDeleteButton()}
      </Form>
    )
  }
}


export default AnnotationForm;
