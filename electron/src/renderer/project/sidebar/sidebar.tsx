import React, { Component, Fragment } from 'react';

import { Treebeard } from 'react-treebeard';

// icons
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBars, faWindowClose} from '@fortawesome/free-solid-svg-icons';
import wikiStore from '@/renderer/data/store';
import { observer } from 'mobx-react';
import { IReactionDisposer, reaction } from 'mobx';
import RequestService from '@/renderer/common/service';

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
}

@observer
class Sidebar extends Component<{}, SidebarState> {
    private disposeReaction?: IReactionDisposer;
    private fileTreeStyle = {};
    private requestService: RequestService;

    
    constructor(props: any){
        super(props);

        this.state = {
            data: {},
            treeFlag: wikiStore.projects.showFileTree,
            cursor: {},
            active: false,
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
                }}}}

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
    
    async onToggle(node: any, toggled: any){
        const cursor = this.state.cursor;
        cursor.active = false;
        this.setState({ cursor });

        node.active = true;
        if (node.children) { 
            node.toggled = toggled; 
        }
    
        if (!node.children && this.state.cursor.name !== node.name) {
            await this.changeDataFile(node.name);
        }
        
        this.setState({ cursor: node }); 
    }

    async changeDataFile(fileName: string) {
        //TODO- check the data updating after merging
        try {
            await this.requestService.changeDataFile(fileName, wikiStore.projects.current!.folder);
        } catch {
            console.error("Error: changing datafile")
        }
    }
    
    getFilesData() {
        const dataFiles = [];
        if (wikiStore.projects.projectDTO && wikiStore.projects.projectDTO.data_files) {
            for(const file of Object.keys(wikiStore.projects.projectDTO.data_files)) {
                dataFiles.push({name: file});
            }
            const data = {
                name: wikiStore.projects.projectDTO.title,
                toggled: true,
                children: dataFiles
            }
            this.setState({data: data});
        }
    }

    render(){
        return (
            <Fragment>
                <div className={wikiStore.projects.showFileTree ? 'opened-sidebar' : 'closed-sidebar'}>
                    <button onClick={() => {wikiStore.projects.showFileTree = !wikiStore.projects.showFileTree}}>
                        {
                            this.state.treeFlag ?
                            <FontAwesomeIcon icon={faWindowClose} />:
                            <FontAwesomeIcon icon={faBars} />
                        }
                    </button>
                    {
                        this.state.treeFlag ?
                        <Treebeard
                        style={this.fileTreeStyle}
                            data={this.state.data}
                            onToggle={this.onToggle}
                        />
                        : null}
                </div>
            </Fragment>
        );
    }
}

export default Sidebar;
