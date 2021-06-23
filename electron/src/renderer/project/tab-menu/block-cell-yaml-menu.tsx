import React, { Component } from 'react';
import { observer } from "mobx-react"
import { Tab, Tabs } from 'react-bootstrap';
import YamlEditor from './yaml-editor';
import CellTab from './cell-tab/cell-tab';
import BlockTab from './block-tab/block-tab';
import PartialCsvPreview from './partial-csv-preview';
import wikiStore from '@/renderer/data/store';

@observer
class BlockCellYamlMenu extends Component {

    onSwitchTab(key?: string|null) {
        console.log("onSwitchTab", key);
        if (key === "block" || key === "cell") {
            wikiStore.wikifyQnodes.qnodes = [];
        }
    }


    render() {
        return (
            <div className="shadow-sm block-menu" style={{ margin: "2px", overflow: "auto" }}>
                <Tabs defaultActiveKey="block" id="tabs" transition={false} onSelect={(key) => this.onSwitchTab(key)}>
                    <Tab eventKey="block" title="Block" >
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
