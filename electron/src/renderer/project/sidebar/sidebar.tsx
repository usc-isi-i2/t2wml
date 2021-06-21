import React, { Component } from 'react';

import wikiStore from '@/renderer/data/store';
import { observer } from 'mobx-react';
import { IReactionDisposer, reaction } from 'mobx';
import RequestService, { IStateWithError } from '@/renderer/common/service';
import { Button, Card, Spinner } from 'react-bootstrap';
import { currentFilesService } from '../../common/current-file-service';
import FileTree from './file-tree/file-tree';
import { ErrorMessage, LOG, t2wmlColors } from '@/renderer/common/general';
import Download from '../tab-menu/cell-tab/cell-output/download';
import ToastMessage from '../../common/toast';
import { remote } from 'electron';
import path from 'path';



// interface SidebarProperties {
// }

interface SidebarState extends IStateWithError {
    data: {
        name?: string,
        toggled?: boolean,
        children?: { name: string; }[]
    },
    cursor: { active?: boolean, name?: any, children?: any },
    active: boolean,
    showSpinner: boolean,
    currFiles: string,

    //download
    filename: string,
    showDownload: boolean,
    isDownloading: boolean
}

const filesTypes = ["Data Files", "Entities"];

@observer
class Sidebar extends Component<{}, SidebarState> {
    private disposers: IReactionDisposer[] = [];
    private requestService: RequestService;


    constructor(props: any) {
        super(props);

        this.state = {
            data: {},
            cursor: {},
            active: false,
            showSpinner: false,
            currFiles: filesTypes[0],
            showDownload: false,
            isDownloading: false,
            filename: "",
            errorMessage: {} as ErrorMessage,
        };

        this.requestService = new RequestService();
        this.onToggle = this.onToggle.bind(this);
    }

    componentDidMount() {
        this.updateFilename()
        this.disposers.push(reaction(() => wikiStore.project.projectDTO, () => this.getFilesData()));
        this.disposers.push(reaction(() => currentFilesService.currentState.dataFile, () => this.updateFilename()));
        this.disposers.push(reaction(() => currentFilesService.currentState.sheetName, () => this.updateFilename()));
    }

    componentWillUnmount() {
        for (const disposer of this.disposers) {
            disposer();
        }
    }


    async handleDoDownload(fileName: string, fileType: string, downloadAll: boolean) {
        const filename = downloadAll ? path.basename(wikiStore.project.projectDTO!.directory) + ".zip" : fileName + "." + fileType;

        // send request
        console.debug("<Output> -> %c/download%c for file: %c" + filename, LOG.link, LOG.default, LOG.highlight);

        let file_path = "";
        const filter = downloadAll ? { name: 'compressed file', extensions: ['zip'] } : { name: '', extensions: [fileType] }
        const result = await remote.dialog.showSaveDialog({
            defaultPath: path.join(wikiStore.project.projectDTO!.directory, filename),
            // properties: ['createDirectory'],
            filters: [filter],
        });
        if (!result.canceled && result.filePath) {
            file_path = result.filePath;
            // before sending request
            this.setState({ isDownloading: true, showDownload: false });

            try {
                await this.requestService.call(this, () => this.requestService.downloadResults(fileType, file_path, downloadAll));
                console.log("<Output> <- %c/download%c with:", LOG.link, LOG.default);
            } catch (error) {
                console.log(error);
            } finally {
                this.setState({ isDownloading: false });
            }
        }
    }

    cancelDownload() {
        this.setState({ showDownload: false, isDownloading: false });
    }

    updateFilename() {
        const datafile = currentFilesService.currentState.dataFile;
        const file_without_ext = datafile.substring(0, datafile.lastIndexOf('.')) || datafile;
        const sheetName = currentFilesService.currentState.sheetName;
        const sheet_without_ext = sheetName.substring(0, sheetName.lastIndexOf('.')) || sheetName;
        const filename = file_without_ext + "_" + sheet_without_ext;
        this.setState({ filename })
    }

    async onToggle(node: any) {//, toggled: any) {
        const cursor = this.state.cursor;
        cursor.active = false;
        this.setState({ cursor });

        if (node) {
            node.active = true;
        }
        // if (node.children) {
        //     node.toggled = toggled;
        // }

        // Does nothing when clicking on the current file
        if (!node.children && node.name !== currentFilesService.currentState.dataFile) {
            wikiStore.partialCsv.showSpinner = true;
            this.setState({ showSpinner: true });

            await this.changeDataFile(node.name);
            wikiStore.partialCsv.showSpinner = false;
            this.setState({ showSpinner: false });
        }

        this.setState({ cursor: node });
    }

    async changeDataFile(fileName: string) {
        // save prev yaml
        wikiStore.table.showSpinner = true;
        wikiStore.yaml.showSpinner = true;
        try {
            await wikiStore.yaml.saveYaml();
            currentFilesService.changeDataFile(fileName);
            await this.requestService.getTable();
        } finally {
            wikiStore.table.showSpinner = false;
            wikiStore.yaml.showSpinner = false;
        }
        wikiStore.partialCsv.showSpinner = true;
        try {
            await this.requestService.getPartialCsv();
        }
        finally {
            wikiStore.partialCsv.showSpinner = false;
        }
    }

    getFilesData() {
        const dataFiles = [];
        if (wikiStore.project.projectDTO && wikiStore.project.projectDTO.data_files) {
            for (const file of Object.keys(wikiStore.project.projectDTO.data_files).sort()) {
                dataFiles.push({ name: file });
            }
            const data = {
                name: wikiStore.project.projectDTO.title,
                toggled: true,
                children: dataFiles
            }
            this.setState({ data: data });

            if (dataFiles.length) {
                const currentNode = dataFiles.find(n => n.name === currentFilesService.currentState.dataFile)
                this.onToggle(currentNode);
            }
        }
    }

    render() {
        return (
            <div className=''>
                <Download
                    key={this.state.filename}
                    filename={this.state.filename}
                    showDownload={this.state.showDownload}
                    handleDoDownload={(fileName: string, fileType: string, downloadAll: boolean) => this.handleDoDownload(fileName, fileType, downloadAll)}
                    cancelDownload={() => this.cancelDownload()} />
                {this.state.errorMessage.errorDescription ? <ToastMessage message={this.state.errorMessage} /> : null}
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
                        <div className="text-white font-weight-bold d-inline-block text-truncate">
                            File Tree
                        </div>

                        <Button
                            className="d-inline-block float-right"
                            variant="outline-light"
                            size="sm"
                            type="button"
                            style={{ padding: "0rem 0.5rem", marginRight: "0.5rem" }}
                            onClick={() => this.setState({ showDownload: true })}
                            disabled={this.state.isDownloading || this.state.filename == "_"} >
                            {this.state.isDownloading ? <Spinner as="span" animation="border" size="sm" /> : "Save to file"}
                        </Button>
                    </Card.Header>

                    {/* card body */}
                    <Card.Body className="w-100 p-0" style={{ height: "calc(100vh - 100px)" }}>
                        <FileTree />
                    </Card.Body>
                </Card>
            </div>
        );
    }
}

export default Sidebar;
