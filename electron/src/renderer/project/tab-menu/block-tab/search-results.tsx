import React from 'react';

import wikiStore from '../../../data/store';
import { IReactionDisposer, reaction } from 'mobx';
import { Col, Row } from 'react-bootstrap';

import { QNode } from '@/renderer/common/dtos';


interface SearchResultsProps {
  onSelect: (key: string, value: QNode) => void;
}


interface SearchResultsState {
  properties: QNode[];
  qnodes: QNode[];
}


class SearchResults extends React.Component<SearchResultsProps, SearchResultsState> {

  private disposers: IReactionDisposer[] = [];

  constructor(props: SearchResultsProps) {
    super(props);

    this.state = {
      properties: [],
      qnodes: [],
    };
  }

  componentDidMount() {
    this.disposers.push(reaction(
      () => wikiStore.annotateProperties.properties,
      properties => this.updateProperties(properties)
    ));

    this.disposers.push(reaction(
      () => wikiStore.wikifyQnodes.qnodes,
      qnodes => this.updateQNodes(qnodes)
    ));
  }

  componentWillUnmount() {
    for (const disposer of this.disposers) {
      disposer();
    }
  }

  updateProperties(properties: QNode[]) {
    this.setState({properties});
  }

  updateQNodes(qnodes: QNode[]) {
    this.setState({qnodes});
  }

  handleOnClick(key: string, value: QNode) {
    const {onSelect} = this.props;
    this.setState({properties: [], qnodes: []}, () => {
      onSelect(key, value);
    })
  }

  render() {
    const {properties, qnodes} = this.state;
    return (
      <div className="results">
        {properties.map((item, index) => (
          <Row className={'property'} key={index}
            onClick={() => this.handleOnClick('property', item)}>
            <Col sm="12" md="12">
              <div className="label">{item.label} ({item.id})</div>
              <div className="description">{item.description}</div>
            </Col>
          </Row>
        ))}
        {qnodes.map((item, index) => (
          <Row className={'qnode'} key={index}
            onClick={() => this.handleOnClick('unit', item)}>
            <Col sm="12" md="12">
              <div className="label">{item.label} ({item.id})</div>
              <div className="description">{item.description}</div>
            </Col>
          </Row>
        ))}
      </div>
    )
  }
}


export default SearchResults;
