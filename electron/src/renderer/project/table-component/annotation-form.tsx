import React from 'react';

import * as utils from './table-utils';

import { Button, Col, Form, Row } from 'react-bootstrap';


const INPUTS = ['role', 'type', 'annotation'];


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


class AnnotationForm extends React.Component {

  handleOnChange(event, input) {
    const { onChange } = this.props;
    const value = (event.target as HTMLInputElement).value;
    onChange(selection, input, value);
  }

  handleOnSubmit(event) {
    event.preventDefault();
    const { selection, onSubmit } = this.props;
    onSubmit(selection);
  }

  render() {
    const { selection, onSubmit } = this.props;
    return (
      <Form className="container annotation-form"
        onSubmit={this.handleOnSubmit.bind(this)}>
        <p className="area">{utils.humanReadableSelection(selection)}</p>
        <Form.Group as={Row}
          onChange={(event) => this.handleOnChange(event, 'role')}>
          <Col sm="12" md="12">
            <Form.Control
              type="text" size="sm"
              placeholder="role" />
          </Col>
        </Form.Group>
        <Form.Group as={Row}
          onChange={(event) => this.handleOnChange(event, 'type')}>
          <Col sm="12" md="12">
            <Form.Control
              type="text" size="sm"
              placeholder="type" />
          </Col>
        </Form.Group>
        <Form.Group as={Row}
          onChange={(event) => this.handleOnChange(event, 'annotation')}>
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
