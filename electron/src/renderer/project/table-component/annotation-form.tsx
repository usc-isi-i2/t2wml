import React from 'react';

import { AnnotationBlock } from '../../common/dtos';
import * as utils from './table-utils';
import { ROLES } from './annotation-options';
import { Button, Col, Form, Row } from 'react-bootstrap';


interface AnnotationFormProperties {
  selectedAnnotationBlock: AnnotationBlock | null,
  selections: Array<any> | null,
  onChange: any | null,
  onSubmit: any | null,
}


interface AnnotationFormState {
  role?: string | null,
  type?: string | null,
}


class AnnotationForm extends React.Component<AnnotationFormProperties, AnnotationFormState> {

  constructor(props: AnnotationFormProperties) {
    super(props);

    this.state = {
      role: null,
      type: null,
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
    const { role, type } = this.state;
    const selectedOption = ROLES.find(option => option.value === role);
    if ( !selectedOption || !('children' in selectedOption) ) { return null; }
    const optionsDropdown = (
      <Form.Group as={Row}
        onChange={(event: React.KeyboardEvent) => this.handleOnChange(event, 'type')}>
        <Col sm="12" md="12">
          <Form.Control size="sm" as="select">
            <option value="" disabled selected>Type</option>
            {selectedOption?.children?.map((type, i) => (
              <option key={i} value={type.value}>
                {type.label}
              </option>
            ))}
          </Form.Control>
        </Col>
      </Form.Group>
    )
    const selectedType = selectedOption?.children?.find(t => t.value === type);
    if ( !selectedType || !('children' in selectedType) ) {
      return optionsDropdown;
    } else {
      return (
        <React.Fragment>
          {optionsDropdown}
          {selectedType?.children?.map((type, i) => (
            <Form.Group as={Row} key={i}
              onChange={(event: React.KeyboardEvent) => this.handleOnChange(event, type.value)}>
              <Col sm="12" md="12">
                <Form.Control
                  type="text" size="sm"
                  placeholder={type.label} />
              </Col>
            </Form.Group>
          ))}
        </React.Fragment>
      )
    }
  }

  renderOptionsDropdown() {
    return (
      <Form.Group as={Row}
        onChange={(event: React.KeyboardEvent) => this.handleOnChange(event, 'role')}>
        <Col sm="12" md="12">
          <Form.Control size="sm" as="select">
            <option value="" disabled selected>Role</option>
            {ROLES.map((role, i) => (
              <option key={i} value={role.value}>
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

  render() {
    return (
      <Form className="container annotation-form"
        onSubmit={this.handleOnSubmit.bind(this)}>
        {this.renderSelectionAreas()}
        {this.renderOptionsDropdown()}
        {this.renderNestedOptionsDropdown()}
        {this.renderSubmitButton()}
      </Form>
    )
  }
}


export default AnnotationForm;
