import React, { Component, Fragment } from 'react';
import { observer } from "mobx-react"
import wikiStore from '../data/store';
import Output from './output/output';
import WikifyMenu from './table/wikify-table/wikify-menu';
import { Col, Container, Row } from 'react-bootstrap';

@observer
class CellTab extends Component {
    render() {
        return (
            <Container>
                <Row>
                    <Col>
                        <WikifyMenu
                            selectedCell={{ col: 1, row: 1, value: "1" }}
                            onSelectBlock={() => { return true; }}
                            wikifyCellContent={"1"}
                        />
                    </Col>
                </Row>
                <Row>
                    <Col>
                        <Output />
                    </Col>
                </Row>
            </Container>
        );
    }
}

export default CellTab;