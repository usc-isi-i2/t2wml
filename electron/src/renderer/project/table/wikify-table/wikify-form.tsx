import React from 'react';

import { IReactionDisposer, reaction } from 'mobx';
import { Col, Form, Row } from 'react-bootstrap';
import wikiStore from '../../../data/store';
import { Cell } from '../../../common/general';
import { QNode } from '@/renderer/common/dtos';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faTimes } from '@fortawesome/free-solid-svg-icons'


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
      qnode: undefined,
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

  handleOnSubmit(event: any) {
    event.preventDefault();
    const { onSubmit } = this.props;
    const { qnodes } = this.state;
    if ( qnodes[0] ) {
      onSubmit({qnode: qnodes[0]});
    }
  }

  handleOnClick(qnode: QNode) {
    const { onSubmit } = this.props;
    onSubmit({qnode});
  }

  getQnodeValue() {
    const { selectedCell } = this.props;
    const qnode = wikiStore.layers.qnode.find(selectedCell);
    if ( qnode ) {
      return qnode.id;
    }
    return 'search qnodes';
  }

  clearSearch() {
    this.setState({
      qnode: undefined,
      qnodes: [],
    });
  }

  renderTextInput() {
    const { qnode, qnodes } = this.state;
    return (
      <Form.Group as={Row}>
        <Col sm="12" md="12">
          <Form.Label className="text-muted">QNode</Form.Label>
          <Form.Control
            type="text" size="sm"
            placeholder="search qnodes"
            value={qnode === undefined ? this.getQnodeValue() : qnode}
            onChange={(event: any) => this.handleOnChange(event, 'qnode')} />
            {qnode || qnodes.length ? (
              <FontAwesomeIcon
                icon={faTimes}
                className="clear-button"
                onClick={this.clearSearch.bind(this)} />
            ) : null}
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

  renderInstanceOf() {
    return (
      <Form.Group as={Row}>
        <Col sm="12" md="12">
          <Form.Label className="text-muted">Instance Of</Form.Label>
          <Form.Control
            type="text" size="sm"
            placeholder="instance of" />
        </Col>
      </Form.Group>
    )
  }

  renderApplyOptions() {
    const style = {
      width: '15px',
      height: '15px',
      marginRight: '5px',
      verticalAlign: 'bottom',
    }
    return (
      <Form.Group as={Row}>
        <Col sm="12" md="12">
          <input id="check-cell" type="checkbox" style={style} defaultChecked={true} />
          <Form.Label for="check-cell" className="text-muted" style={{cursor: 'pointer'}}>Apply to cell</Form.Label>
        </Col>
        <br />
        <br />
        <Col sm="12" md="12">
          <input id="check-block" type="checkbox" style={style} defaultChecked={false} />
          <Form.Label for="check-block" className="text-muted" style={{cursor: 'pointer'}}>Apply to block</Form.Label>
        </Col>
      </Form.Group>
    )
  }

  render() {
    return (
      <Form className="container wikify-form"
        onSubmit={(event: any) => this.handleOnSubmit(event)}>
        {this.renderTextInput()}
        <div className="results">
          {this.renderQNodeResults()}
        </div>
        {this.renderInstanceOf()}
        {this.renderApplyOptions()}
      </Form>
    )
  }
}


export default WikifyForm;
