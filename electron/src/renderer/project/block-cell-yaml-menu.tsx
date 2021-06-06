import React, { Component } from 'react';
import { observer } from "mobx-react"
import { Tab, Tabs } from 'react-bootstrap';
import YamlEditor from './yaml-editor/yaml-editor';
import CellTab from './cell-tab';
import BlockTab from './block-tab';
import PartialCsvPreview from './wikifier/wikifier';

@observer
class BlockCellYamlMenu extends Component {


    render() {
        return (
            <div className="shadow-sm block-menu" style={{ margin: "2px", overflow: "auto"}}>
                <Tabs defaultActiveKey="block" id="tabs" transition={false}>
                <Tab eventKey="block" title="Block">
                        <BlockTab />
                    </Tab>
                    <Tab eventKey="cell" title="Cell">
                        <CellTab />
                    </Tab>
                    <Tab eventKey="yaml" title="YAML">
                        <YamlEditor />
                    </Tab>
                    <Tab eventKey="output" title="Output Preview">
                        <PartialCsvPreview />
                    </Tab>


                </Tabs>
            </div>
        );
    }
}

export default BlockCellYamlMenu;
