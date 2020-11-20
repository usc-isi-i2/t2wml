import React from 'react';

import * as utils from './table-utils';

import { Col, Form, Row } from 'react-bootstrap';


const INPUTS = ['role', 'type', 'annotation'];


class AnnotationForm extends React.Component {

  handleOnChange(event, input) {
    const { onChange } = this.props;
    const value = (event.target as HTMLInputElement).value;
    onChange(selection, input, value);
  }

  render() {
    const { selection } = this.props;
    return (
      <Form className="container">
        <h7>{utils.humanReadableSelection(selection)}</h7>
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
      </Form>
    )
  }
}


export default AnnotationForm;
