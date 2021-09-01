import React, { Component } from 'react';
import { observer } from "mobx-react";
import { Button, Col, ListGroup, Modal, Row, Tab } from 'react-bootstrap';

import RequestService, { IStateWithError } from '@/renderer/common/service';
import wikiStore from '@/renderer/data/store';
import { currentFilesService } from '@/renderer/common/current-file-service';
import { ErrorMessage } from '@/renderer/common/general';
import { IReactionDisposer, reaction } from 'mobx';

export type FileType = "DataFile" | "SingleSheetDataFile" | "Sheet" | "Label" | "Yaml" | "Annotation" | "Wikifier" | "Entity";

interface FileDetails {
    id: string;
    label: string;
    // description: string;
    type: FileType;
    children: FileDetails[];
    parent?: FileDetails;
}

interface CopyAnnotationMenuState extends IStateWithError {
    fileList: FileDetails[]
}

interface CopyAnnotationMenuProps {
    handleOnCopy: () => void;
    handleOnCancel: () => void;
    showCopyAnnotationMenu: boolean;
}

@observer
class CopyAnnotationMenu extends Component<CopyAnnotationMenuProps, CopyAnnotationMenuState> {

    private requestService: RequestService;
    private disposers: IReactionDisposer[] = [];

    constructor(props: CopyAnnotationMenuProps) {
        super(props);

        this.requestService = new RequestService();

        const fileList: FileDetails[] = this.buildFileList()
        this.state = {
            fileList: fileList,
            errorMessage: {} as ErrorMessage,
        };
    }

    componentDidMount() {
        this.disposers.push(reaction(() => wikiStore.project.projectDTO, () => this.updateFileList()));
        //until we figure out why reactions to currentState aren't working, just subscribing inidivually
        this.disposers.push(reaction(() => currentFilesService.currentState, () => this.updateFileList()));
        this.disposers.push(reaction(() => currentFilesService.currentState.dataFile, () => this.updateFileList()));
        this.disposers.push(reaction(() => currentFilesService.currentState.sheetName, () => this.updateFileList()));
        this.disposers.push(reaction(() => currentFilesService.currentState.mappingFile, () => this.updateFileList()));
        this.updateFileList();
    }

    updateFileList() {
        const fileList = this.buildFileList();
        this.setState({ fileList });
    }

    buildSubFileList(projDict: any, df: string, sheetName: string, parentNode: FileDetails) {
        if (!projDict[df] || !projDict[df][sheetName]) {
            return;
        }
        for (const filename of projDict[df][sheetName]["val_arr"]) {
            if (!currentFilesService.currentState.mappingFile == filename) {
                parentNode.children.push(
                    {
                        id: filename + parentNode.id,
                        label: filename,
                        children: [] as FileDetails[],
                        type: "Annotation",
                        parent: parentNode
                    }
                );
            }
        }
    }


    buildFileList() {
        const project = wikiStore.project.projectDTO;
        const files = [] as FileDetails[]
        if (!project?.title || !project.data_files) { return files; }
        for (const df of Object.keys(project.data_files).sort()) {
            const sheet_arr = project.data_files[df].val_arr;
            let dataType = "DataFile"
            if (sheet_arr.length < 2) {
                dataType = "SingleSheetDataFile"
            }
            if (! (currentFilesService.currentState.dataFile === df)) {
                const dataNode = {
                    id: df,
                    label: df,
                    type: dataType as FileType,
                    children: [] as FileDetails[],
                };
                for (const sheetName of sheet_arr) {
                    const sheetNode = {
                        id: sheetName + df,
                        label: sheetName,
                        children: [] as FileDetails[],
                        type: "Sheet" as FileType,
                        parent: dataNode,
                    };
                    this.buildSubFileList(project.annotations, df, sheetName, sheetNode)
                    dataNode.children.push(sheetNode);
                }
                files.push(dataNode)
            }
        }
        return files;
    }

    render() {

        return (
            <Modal show={this.props.showCopyAnnotationMenu} onHide={() => { /* do nothing */ }} size='lg' >

                {/* loading spinner */}
                {/* <div className="mySpinner" hidden={!this.props.showSpinner}>
                    <Spinner animation="border" />
                </div> */}

                {/* header */}
                <Modal.Header style={{ background: "whitesmoke" }}>
                    <Modal.Title>Import existing annotation file</Modal.Title>
                </Modal.Header>

                {/* body */}
                <Modal.Body>
                    <Tab.Container id="list-group-tabs">
                        <Row>
                            <Col sm={6}>
                                <ListGroup>
                                    {
                                        this.state.fileList.map((file) => (
                                            <ListGroup.Item variant="light" action href={`#${file.id}`} key={file.id}>
                                                {file.label}
                                            </ListGroup.Item>
                                        ))
                                    }

                                </ListGroup>
                            </Col>
                            <Col sm={6}>
                                <Tab.Content>
                                    {
                                        this.state.fileList.map((file) => (
                                            <Tab.Pane eventKey={`#${file.id}`} key={file.id}>
                                                {file.label}
                                            </Tab.Pane>
                                        ))
                                    }
                                </Tab.Content>
                            </Col>
                        </Row>
                    </Tab.Container>
                </Modal.Body>

                {/* footer */}
                <Modal.Footer style={{ background: "whitesmoke" }}>
                    <Button variant="outline-dark" onClick={() => { this.props.handleOnCancel() }} >
                        Cancel
                    </Button>
                    <Button variant="dark" onClick={() => { this.props.handleOnCopy() }}>
                        Copy
                    </Button>
                </Modal.Footer>

            </Modal>
        );
    }


}


export default CopyAnnotationMenu;
