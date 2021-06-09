import React, { Component } from 'react';

// icons
import wikiStore from '@/renderer/data/store';
import { observer } from 'mobx-react';
import { IReactionDisposer, reaction } from 'mobx';
import RequestService from '@/renderer/common/service';
import { Card, Spinner } from 'react-bootstrap';
import { currentFilesService } from '../../common/current-file-service';
import FileTree from './file-tree/file-tree';
import { t2wmlColors } from '@/renderer/common/general';
import EntitiesTree from './file-tree/entities-tree';
import SheetSelector from '../sheet-selector/sheet-selector';


// interface SidebarProperties {
// }

interface SidebarState {
    data: {
        name?: string,
        toggled?: boolean,
        children?: {name: string;}[]
    },
    cursor: { active?: boolean, name?: any, children?: any },
    active: boolean,
    showSpinner: boolean,
    currFiles: string,
}

const filesTypes = ["Data Files", "Entities"];

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
        this.disposeReaction = reaction(() => wikiStore.project.projectDTO, () => this.getFilesData());
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

        if(node){
            node.active = true;
        }
        // if (node.children) {
        //     node.toggled = toggled;
        // }

        // Does nothing when clicking on the current file
        if (!node.children && node.name !== currentFilesService.currentState.dataFile) {
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
        wikiStore.table.showSpinner = true;
        wikiStore.yaml.showSpinner = true;
        try{
            await wikiStore.yaml.saveYaml();
            currentFilesService.changeDataFile(fileName);
            await this.requestService.getTable();
        }finally{
          wikiStore.table.showSpinner = false;
          wikiStore.yaml.showSpinner = false;
        }
        wikiStore.wikifier.showSpinner = true;
        try{
        await this.requestService.getPartialCsv();
        }
        finally{
        wikiStore.wikifier.showSpinner = false;
        }
    }

    getFilesData() {
        const dataFiles = [];
        if (wikiStore.project.projectDTO && wikiStore.project.projectDTO.data_files) {
            for(const file of Object.keys(wikiStore.project.projectDTO.data_files).sort()) {
                dataFiles.push({name: file});
            }
            const data = {
                name: wikiStore.project.projectDTO.title,
                toggled: true,
                children: dataFiles
            }
            this.setState({data: data});

            if (dataFiles.length) {
                const currentNode = dataFiles.find(n => n.name === currentFilesService.currentState.dataFile)
                this.onToggle(currentNode);
            }
        }
    }

    render() {

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
                        <Card.Body className="w-100 p-0" style={{ height: "calc(100vh - 40px)"}}>
                                <FileTree />
                        </Card.Body>
                    </Card>
            </div>
        );
    }
}

export default Sidebar;
