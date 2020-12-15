import React from 'react';

import { AnnotationBlock } from '../../common/dtos';
import * as utils from './table-utils';
import { ROLES } from './annotation-options';
import { Button, Col, Form, Row } from 'react-bootstrap';


interface AnnotationFormProperties {
  selectedAnnotationBlock?: AnnotationBlock,
  selections?: Array<any>,
  onChange: any | null, // Use the actual function type: (arg: argType) => returnType
  onDelete: any | null,
  onSubmit: any | null,
}


interface AnnotationFormState {
  role?: string,
  type?: string,
}


class AnnotationForm extends React.Component<AnnotationFormProperties, AnnotationFormState> {

  constructor(props: AnnotationFormProperties) {
    super(props);

    const { selectedAnnotationBlock: selectedBlock } = this.props;
    this.state = {
      role: selectedBlock?.role,
      type: selectedBlock?.type,
    };
  }

  handleOnChange(event: any, key: string) {
    const { onChange } = this.props;
    const value = (event.target as HTMLInputElement).value;
    const updatedState: { [key: string]: string; } = {};
    updatedState[key] = value;
    this.setState({...updatedState}, () => onChange(key, value));
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
    const { selections } = this.props;
    if ( !selections ) { return null; }
    return selections.map((selection: any, index: number) => (
      <p className="area" key={index}>
        {utils.humanReadableSelection(selection)}
      </p>
    ));
  }

  renderNestedOptionsDropdown() {
    const { selectedAnnotationBlock: selectedBlock } = this.props;
    const selectedAnnotationRole =  selectedBlock ? selectedBlock.role : '';
    const selectedAnnotationType =  selectedBlock ? selectedBlock.type : '';
    const { role, type } = this.state;
    let selectedOption = null;
    if ( selectedAnnotationRole ) {
      selectedOption = ROLES.find(option => (
        option.value === selectedAnnotationRole
      ));
    } else {
      selectedOption = ROLES.find(option => option.value === role);
    }
    if ( !selectedOption || !('children' in selectedOption) ) { return null; }
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
    if ( selectedAnnotationType ) {
      selectedType = selectedOption?.children?.find(option => (
        option.value === selectedAnnotationType
      ));
    } else {
      selectedType = selectedOption?.children?.find(option => (
        option.value === type
      ));
    }
    if ( !selectedType || !('children' in selectedType) ) {
      return optionsDropdown;
    } else {
      return (
        <React.Fragment>
          {optionsDropdown}
          {selectedType?.children?.map((type, i) => {
            let defaultValue = '';
            if ( selectedBlock ) {
              defaultValue = (selectedBlock as any)[type.value];
            }
            return (
              <Form.Group as={Row} key={i}
                onChange={(event: React.KeyboardEvent) => this.handleOnChange(event, type.value)}>
                <Col sm="12" md="12">
                  <Form.Label className="text-muted">{type.label}</Form.Label>
                  <Form.Control
                    type="text" size="sm"
                    defaultValue={defaultValue} />
                </Col>
              </Form.Group>
          )
          })}
        </React.Fragment>
      )
    }
  }

  renderOptionsDropdown() {
    const { selectedAnnotationBlock: selected } = this.props;
    const selectedAnnotationRole =  selected ? selected.role : '';
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
    if ( selectedBlock ) {
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
        {this.renderNestedOptionsDropdown()}
        {this.renderSubmitButton()}
        {this.renderDeleteButton()}
      </Form>
    )
  }
}


export default AnnotationForm;
