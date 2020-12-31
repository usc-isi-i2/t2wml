import React, { Component } from 'react';

// icons
import wikiStore from '@/renderer/data/store';
import { observer } from 'mobx-react';
import { IReactionDisposer, reaction } from 'mobx';
import RequestService from '@/renderer/common/service';
import { Card, Spinner } from 'react-bootstrap';
import { saveFiles } from '../save-files';
import FileTree from './file-tree/file-tree';
import { t2wmlColors } from '@/renderer/common/general';
import SheetSelector from '../sheet-selector/sheet-selector';


// interface SidebarProperties {
// }

interface SidebarState {
    data: any,
    cursor: any,
    active: boolean,
    showSpinner: boolean,
    currFiles: string,
}

const filesTypes = ["Data Files", "Mapping", "Wikifiers"];

@observer
class Sidebar extends Component<{}, SidebarState> {
    private disposeReaction?: IReactionDisposer;
    private requestService: RequestService;


    constructor(props: any){
        super(props);

        this.state = {
            data: {},
            cursor: {},
            active: false,
            showSpinner: false,
            currFiles: filesTypes[0],
        } as SidebarState;

        this.requestService = new RequestService();
        this.onToggle = this.onToggle.bind(this);
    }

    componentDidMount() {
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

        await this.requestService.getYamlCalculation();
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

    render() {
        let currentFileTree;
        if (this.state.currFiles === filesTypes[0]) {
            currentFileTree = <FileTree />; // <DataFiles />
        } else if (this.state.currFiles === filesTypes[1]) { // mapping (yamls)
            currentFileTree = <FileTree />; // <Mapping />
        } else { // wikifiers
            currentFileTree = <FileTree /> ;// <Wikifiers />
        }
        
        return (
            <div className=''>
            {
                /* loading spinner */}
                <div className="mySpinner" hidden={!this.state.showSpinner}>
                    <Spinner animation="border" />
                </div>
                
                <Card className="w-100 shadow-sm"
                        style={{ height: "calc(100% - 40px)", marginTop: "0.25rem" }}>
                        {/* card header */}
                        <Card.Header style={{ height: "40px", padding: "0.5rem 1rem", background: t2wmlColors.TREE }}>
                            {/* title */}
                            <div
                                className="text-white font-weight-bold d-inline-block text-truncate"
                            >File Tree</div>
                        </Card.Header>

                        {/* card body */}
                        {/* height: ... -150px */}
                        <Card.Body className="w-100 p-0" style={{ height: "calc(100vh - 100px)", display: "flex", overflow: "auto" }}>
                            {currentFileTree}
                        </Card.Body>
                        {/* <Card.Footer style={{ height: "50px" }}>
                            <SheetSelector
                                sheetNames={filesTypes}
                                currSheetName={this.state.currFiles}
                                handleSelectSheet={(event: any) => this.setState({currFiles: event.target!.innerHTML})}/>
                        </Card.Footer> */}
                    </Card>
            </div>
        );
    }
}

export default Sidebar;
