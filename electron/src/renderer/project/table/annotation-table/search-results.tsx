import React from 'react';

import wikiStore from '../../../data/store';
import { IReactionDisposer, reaction } from 'mobx';
import { Col, Row } from 'react-bootstrap';

import { Property } from '@/renderer/common/dtos';


interface SearchResultsProps {
  onSelect: (key: string, value: string) => void;
}


interface SearchResultsState {
  properties: Property[];
}


class SearchResults extends React.Component<SearchResultsProps, SearchResultsState> {

  private disposers: IReactionDisposer[] = [];

  constructor(props: SearchResultsProps) {
    super(props);

    this.state = {
      properties: [],
    };
  }

  componentDidMount() {
    this.disposers.push(reaction(
      () => wikiStore.annotateProperties.properties,
      properties => this.updateProperties(properties)
    ));
  }

  componentWillUnmount() {
    for (const disposer of this.disposers) {
      disposer();
    }
  }

  updateProperties(properties: Property[]) {
    this.setState({properties});
  }

  handleOnClick(key: string, value: string) {
    const {onSelect} = this.props;
    this.setState({properties: []}, () => {
      onSelect(key, value);
    })
  }

  render() {
    const {properties} = this.state;
    return (
      <div className="results">
        {properties.map((item, index) => (
          <Row className={'property'} key={index}
            onClick={() => this.handleOnClick('property', item.id)}>
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
