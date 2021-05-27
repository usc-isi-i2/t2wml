import React, { Component } from 'react';
import { observer } from "mobx-react"
import { Button, Tab, Tabs } from 'react-bootstrap';
import YamlEditor from './yaml-editor/yaml-editor';
import CellTab from './cell-tab';
import BlockTab from './block-tab';
import EntityMenu from './table/entity-menu';

@observer
class BlockCellYamlMenu extends Component {
    state = {
        showEntityMenu: false
    }

    changeShowEntityMenu(){
        console.log(":handler")
        const { showEntityMenu } = this.state;
        this.setState({showEntityMenu: !showEntityMenu})
    }

    render() {
        const { showEntityMenu } = this.state;
        return (
<<<<<<< HEAD
            <div className="w-100 shadow-sm h-100" style={{ margin: "2px" }}>
                <Button
                    type="button"
                    onClick={() => this.changeShowEntityMenu()}>
                Create entity
                </Button>
                {
                    showEntityMenu ? 
                    <EntityMenu showEntityMenu={showEntityMenu} handler={() => this.changeShowEntityMenu.bind(this)} />
                    : null
                }
                
=======
            <div className="w-100 shadow-sm h-100 block-menu" style={{ margin: "2px" }}>
>>>>>>> table-refactor-css
                <Tabs defaultActiveKey="block" id="tabs" transition={false}>
                <Tab eventKey="block" title="Block">
                        <BlockTab />
                    </Tab>
                    <Tab eventKey="cell" title="Cell">
                        <CellTab />
                    </Tab>
                    <Tab eventKey="yaml" title="YAML">
                        <YamlEditor isShowing={true} />
                    </Tab>
                </Tabs>
            </div>
        );
    }
}

export default BlockCellYamlMenu;