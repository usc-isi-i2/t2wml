import React from 'react';

import { IReactionDisposer, reaction } from 'mobx';
import { Col, Form, Row } from 'react-bootstrap';
import wikiStore from '../../../data/store';
import { Cell } from '../../../common/general';
import { QNode } from '@/renderer/common/dtos';


interface WikifyFormProperties {
  selectedCell: Cell;
  onChange: any | null; // Use the actual function type: (arg: argType) => returnType
  onSubmit: any | null;
}


interface WikifyFormState {
  qnode?: string;
  qnodes: QNode[];
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

  updateQNodes(qnodes: QNode[]) {
    this.setState({qnodes});
  }

  handleOnChange(event: any, key: string) {
    const { onChange } = this.props;
    const value: string = (event.target as HTMLInputElement).value;
    this.setState({qnode: value}, () => onChange(key, value));
  }

  handleOnClick(qnode: QNode) {
    const { onSubmit } = this.props;
    onSubmit({qnode});
  }

  renderTextInput() {
    const { selectedCell } = this.props;
    const qnode = wikiStore.layers.qnode.find(selectedCell);
    let defaultValue = 'search qnodes';
    if ( qnode ) {
      defaultValue = qnode.id;
    }
    return (
      <Form.Group as={Row}
        onChange={(event: React.KeyboardEvent) => this.handleOnChange(event, 'qnode')}>
        <Col sm="12" md="12">
          <Form.Label className="text-muted">qnode</Form.Label>
          <Form.Control
            type="text" size="sm"
            placeholder="search qnodes"
            defaultValue={defaultValue} />
        </Col>
      </Form.Group>
    )
  }

  renderQNodeResults() {
    const { qnodes } = this.state;
    return qnodes.map((item, index) => (
      <Row className={"qnode"} key={index}
        onClick={() => this.handleOnClick(item)}>
        <Col sm="12" md="12">
          <div className="label">{item.label} ({item.id})</div>
          <div className="description">{item.description}</div>
        </Col>
      </Row>
    ));
  }

  render() {
    return (
      <Form className="container wikify-form">
        {this.renderTextInput()}
        <div className="results">
          {this.renderQNodeResults()}
        </div>
      </Form>
    )
  }
}


export default WikifyForm;
