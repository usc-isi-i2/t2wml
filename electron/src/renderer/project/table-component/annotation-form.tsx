import React from 'react';

import * as utils from './table-utils';

import { Button, Col, Form, Row } from 'react-bootstrap';


const TYPES = [{
  'label': 'string',
  'value': 'string',
}, {
  'label': 'monolingual string',
  'value': 'monolingualString',
  'children': [{
    'label': 'language',
    'value': 'language',
  }],
}, {
  'label': 'quantity',
  'value': 'quantity',
  'children': [{
    'label': 'unit',
    'value': 'unit',
  }],
}, {
  'label': 'time',
  'value': 'time',
  'children': [{
    'label': 'precision',
    'value': 'precision',
  }, {
    'label': 'calendar',
    'value': 'calendar',
  }, {
    'label': 'format',
    'value': 'format',
  }],
}, {
  'label': 'Q-Node',
  'value': 'qNode',
  'children': [{
    'label': 'Q-Node ID',
    'value': 'qNodeID',
  }],
}];


const OPTIONS = [{
  'label': 'main subject',
  'value': 'mainSubject',
}, {
  'label': 'property',
  'value': 'property',
}, {
  'label': 'qualifier',
  'value': 'qualifier',
  'children': TYPES,
}, {
  'label': 'dependent variable',
  'value': 'dependentVar',
  'children': TYPES,
}, {
  'label': 'metadata',
  'value': 'metadata',
}];


interface AnnotationFormProperties {
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

  renderNestedOptionsDropdown() {
    const { role } = this.state;
    const option = OPTIONS.find(option => option.value === role);
    if ( !option || !('children' in option) ) { return null; }
    return (
      <Form.Group as={Row}
        onChange={(event: React.KeyboardEvent) => this.handleOnChange(event, 'type')}>
        <Col sm="12" md="12">
          <Form.Control size="sm" as="select">
            <option value="" disabled selected>Type</option>
            {option?.children?.map((type, i) => (
              <option key={i} value={type.value}>
                {type.label}
              </option>
            ))}
          </Form.Control>
        </Col>
      </Form.Group>
    )
  }

  renderOptionsDropdown() {
    return (
      <Form.Group as={Row}
        onChange={(event: React.KeyboardEvent) => this.handleOnChange(event, 'role')}>
        <Col sm="12" md="12">
          <Form.Control size="sm" as="select">
            <option value="" disabled selected>Role</option>
            {OPTIONS.map((role, i) => (
              <option key={i} value={role.value}>
                {role.label}
              </option>
            ))}
          </Form.Control>
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
