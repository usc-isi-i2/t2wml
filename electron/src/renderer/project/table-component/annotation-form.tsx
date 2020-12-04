import React from 'react';

import * as utils from './table-utils';

import { Button, Col, Form, Row } from 'react-bootstrap';


const ROLES = [{
  'label': 'main subject',
  'value': 'mainSubject',
}, {
  'label': 'property',
  'value': 'property',
}, {
  'label': 'qualifier',
  'value': 'qualifier',
}, {
  'label': 'dependent variable',
  'value': 'dependentVar',
}, {
  'label': 'metadata',
  'value': 'metadata',
}];


const TYPES = [{
  'label': 'string',
  'value': 'string',
}, {
  'label': 'monolingual string',
  'value': 'monolingualString',
}, {
  'label': 'quantity',
  'value': 'quantity',
}, {
  'label': 'time',
  'value': 'time',
}, {
  'label': 'q-node',
  'value': 'qNode',
}];


interface AnnotationFormProperties {
  selections: Array<any> | null,
  onChange: any | null,
  onSubmit: any | null,
}


class AnnotationForm extends React.Component<AnnotationFormProperties, {}> {

  handleOnChange(event: any, key: string) {
    const { onChange } = this.props;
    const value = (event.target as HTMLInputElement).value;
    onChange(key, value);
  }

  handleOnSubmit(event: any) {
    event.preventDefault();
    const { onSubmit } = this.props;
    onSubmit();
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

  render() {
    return (
      <Form className="container annotation-form"
        onSubmit={this.handleOnSubmit.bind(this)}>
        {this.renderSelectionAreas()}
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
        <Form.Group as={Row}
          onChange={(event: React.KeyboardEvent) => this.handleOnChange(event, 'type')}>
          <Col sm="12" md="12">
            <Form.Control size="sm" as="select">
              <option value="" disabled selected>Type</option>
              {TYPES.map((type, i) => (
                <option key={i} value={type.value}>
                  {type.label}
                </option>
              ))}
            </Form.Control>
          </Col>
        </Form.Group>
        <Form.Group as={Row}
          onChange={(event: React.KeyboardEvent) => this.handleOnChange(event, 'annotation')}>
          <Col sm="12" md="12">
            <Form.Control
              type="text" size="sm"
              placeholder="annotation" />
          </Col>
        </Form.Group>
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
      </Form>
    )
  }
}


export default AnnotationForm;
