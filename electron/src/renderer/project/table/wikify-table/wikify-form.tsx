import React from 'react';

import { IReactionDisposer, reaction } from 'mobx';
import { Button, Col, Form, Row } from 'react-bootstrap';
import wikiStore from '../../../data/store';
import { QNodeDTO } from '@/renderer/common/dtos';


interface WikifyFormProperties {
  onChange: any | null, // Use the actual function type: (arg: argType) => returnType
  onSubmit: any | null,
}


interface WikifyFormState {
  qnode?: string,
  qnodes: QNodeDTO[]
}


class WikifyForm extends React.Component<WikifyFormProperties, WikifyFormState> {

  constructor(props: WikifyFormProperties) {
    super(props);

    this.state = {
      qnode: '',
      qnodes: [],
    };
  }

  private disposers: IReactionDisposer[] = [];

  componentDidMount() {
    this.disposers.push(reaction(() => wikiStore.wikifyQnodes.qnodes, (qnodes) => this.updateQNodes(qnodes)));
  }

  componentWillUnmount() {
    for (const disposer of this.disposers) {
      disposer();
    }
  }

  updateQNodes(qnodes: QNodeDTO[]) {
    this.setState({qnodes});
  }

  handleOnChange(event: any, key: string) {
    const { onChange } = this.props;
    const value = (event.target as HTMLInputElement).value;
    const updatedState: { [key: string]: string; } = {};
    updatedState[key] = value;
    this.setState({ ...updatedState }, () => onChange(key, value));
  }

  handleOnSubmit(event: any) {
    event.preventDefault();
    const { onSubmit } = this.props;
    onSubmit(this.state);
  }

  renderTextInput() {
    return (
      <Form.Group as={Row}
        onChange={(event: React.KeyboardEvent) => this.handleOnChange(event, 'qnode')}>
        <Col sm="12" md="12">
          <Form.Label className="text-muted">qnode</Form.Label>
          <Form.Control type="text" placeholder="qnode" size="sm" />
        </Col>
      </Form.Group>
    )
  }

  renderQNodeResults() {
    const { qnodes } = this.state;
    console.log(qnodes)
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
      <Form className="container wikify-form"
        onSubmit={this.handleOnSubmit.bind(this)}>
        {this.renderTextInput()}
        {this.renderQNodeResults()}
        {this.renderSubmitButton()}
      </Form>
    )
  }
}


export default WikifyForm;
