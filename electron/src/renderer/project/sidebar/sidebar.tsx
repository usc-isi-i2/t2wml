import React, { Component } from 'react';

import { Treebeard, TreeTheme } from 'react-treebeard';

// icons
import wikiStore from '@/renderer/data/store';
import { observer } from 'mobx-react';
import { IReactionDisposer, reaction } from 'mobx';
import RequestService from '@/renderer/common/service';
import { Spinner } from 'react-bootstrap';
import { saveFiles } from '../save-files';

// const data = {
//     name: 'root',
//     toggled: true,
//     children: [
//         {
//             name: 'parent',
//             children: [
//                 { name: 'child1' },
//                 { name: 'child2' }
//             ]
//         },
//         {
//             name: 'loading parent',
//             loading: true,
//             children: []
//         },
//         {
//             name: 'parent',
//             children: [
//                 {
//                     name: 'nested parent',
//                     children: [
//                         { name: 'nested child 1' },
//                         { name: 'nested child 2' }
//                     ]
//                 }
//             ]
//         }
//     ]
// };

// interface SidebarProperties {
// }

interface SidebarState {
    data: any,
    treeFlag: boolean,
    cursor: any,
    active: boolean,
    showSpinner: boolean,
}

@observer
class Sidebar extends Component<{}, SidebarState> {
    private disposeReaction?: IReactionDisposer;
    private fileTreeStyle: TreeTheme;
    private requestService: RequestService;


    constructor(props: any){
        super(props);

        this.state = {
            data: {},
            treeFlag: wikiStore.projects.showFileTree,
            cursor: {},
            active: false,
            showSpinner: false,
        } as SidebarState;

        this.fileTreeStyle = {
            tree: {
                base: {
                    backgroundColor: "white"
                },
                node: {
                    activeLink: {
                        background: '#DCDCDC',
                        fontWeight: 'bold'
                }}}};

        this.requestService = new RequestService();
        this.onToggle = this.onToggle.bind(this);
    }

    componentDidMount() {
        this.disposeReaction = reaction(() => wikiStore.projects.showFileTree, (flag) => {this.setState({treeFlag: flag})});
        this.disposeReaction = reaction(() => wikiStore.projects.projectDTO, () => this.getFilesData());
    }

    componentWillUnmount() {
        if (this.disposeReaction) {
          this.disposeReaction();
        }
    }

    async onToggle(node: any) {//, toggled: any) {
        const cursor = this.state.cursor;
        cursor.active = false;
        this.setState({ cursor });

        node.active = true;
        // if (node.children) {
        //     node.toggled = toggled;
        // }

        // Does nothing when clicking on the current file
        if (!node.children && node.name !== saveFiles.currentState.dataFile) {
            wikiStore.wikifier.showSpinner = true;
            this.setState({showSpinner: true});

            await this.changeDataFile(node.name);
            wikiStore.wikifier.showSpinner = false;
            this.setState({showSpinner: false});
        }

        this.setState({ cursor: node });
    }

    async changeDataFile(fileName: string) {
        // save prev yaml
        await wikiStore.yaml.saveYaml();

        saveFiles.changeDataFile(fileName);

        await this.requestService.getYamlCalculation(saveFiles.currentState);
    }

    getFilesData() {
        const dataFiles = [];
        if (wikiStore.projects.projectDTO && wikiStore.projects.projectDTO.data_files) {
            for(const file of Object.keys(wikiStore.projects.projectDTO.data_files).sort()) {
                dataFiles.push({name: file});
            }
            const data = {
                name: wikiStore.projects.projectDTO.title,
                toggled: true,
                children: dataFiles
            }
            this.setState({data: data});

            if (dataFiles.length) {
                const currentNode = dataFiles.find(n => n.name === saveFiles.currentState.dataFile)
                this.onToggle(currentNode);
            }
        }
    }

    render(){
        return (
            <div className={this.state.treeFlag ? 'opened-sidebar' : 'closed-sidebar'}>
            {
                /* loading spinner */}
                <div className="mySpinner" hidden={!this.state.showSpinner}>
                    <Spinner animation="border" />
                </div>
                {
                    this.state.treeFlag ?
                    <Treebeard
                      style={this.fileTreeStyle}
                        data={this.state.data}
                        onToggle={this.onToggle}
                    />
                    : null}
            </div>
        );
    }
}

export default Sidebar;
