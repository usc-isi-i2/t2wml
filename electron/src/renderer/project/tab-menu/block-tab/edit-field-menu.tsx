import React, { Component } from 'react';
import { observer } from "mobx-react"
import Draggable from 'react-draggable';
import { Toast } from 'react-bootstrap';
import './edit-field-menu.css'

import { CellSelection, ErrorMessage } from '@/renderer/common/general';
import { EntityFields, QNode } from '@/renderer/common/dtos';
import { humanReadableSelection } from '../../table/table-utils';
import RequestService, { IStateWithError } from '@/renderer/common/service';
import ToastMessage from '@/renderer/common/toast';
import WikifyForm from '../wikify-form';
import wikiStore from '@/renderer/data/store';

interface EditFieldMenuState extends IStateWithError {
}

interface EditFieldMenuProps {
    onClose: (key:string, entityFields?: EntityFields) => void,
    selection: CellSelection,
    title: string,
    data_type?: string,
    // showResults: boolean,
    onSelectNode: (key: string, value?: QNode) => void,
}

@observer
class EditFieldMenu extends Component<EditFieldMenuProps, EditFieldMenuState> {

    private requestService: RequestService;
    private timeoutSearch?: number;


    constructor(props: any) {
        super(props);

        this.requestService = new RequestService();

        this.state = {
            errorMessage: {} as ErrorMessage,
        }
    }


    async handleOnSearch(key: string, value?: string, instanceOf?: QNode, searchProperties?:boolean) {

        if (!value) { return; }
        const isClass = key === 'instanceOfSearch';

        if (key === "unit") {
            instanceOf = {
                label: 'unit of measurement',
                description: 'quantity, defined and adopted by convention',
                id: 'Q47574',
            }
        } 
        // else if(key === "subject" && ! instanceOf){
        //     instanceOf = {
        //         label: 'country',
        //         description: 'the distinct region in geography; a broad term that can include political divisions or regions associated with distinct political characteristics',
        //         id: 'Q6256',
        //         url: 'https://www.wikidata.org/wiki/Q6256'
        //       }
        // }

        try {
            await this.requestService.call(this, () => (
                this.requestService.getQNodes(value, isClass, instanceOf, searchProperties)
            ));
        } catch (error) {
            error.errorDescription += `\nWasn't able to find any qnodes for ${value}`;
            this.setState({ errorMessage: error });
        } finally {
            console.log('qnodes request finished');
        }

    }


    async handleOnSubmit(qnode?: QNode) {
        const { title } = this.props;
        if (title){
            this.props.onSelectNode(title.toLowerCase(), qnode);
        }
        this.props.onClose(this.props.title.toLowerCase());
    }

    async handleOnCreateNode(entityFields: EntityFields){
        this.props.onClose(this.props.title.toLowerCase(), entityFields);
    }

    render() {
        const { onClose, selection, title } = this.props;
        const position = { x: window.innerWidth * 0.05, y: 0 };

        const selectedCell = wikiStore.table.selectedCell;
        return (
            <Draggable handle=".handle"
                defaultPosition={position}>
                <div className="edit-field-menu">
                    {this.state.errorMessage.errorDescription ? <ToastMessage message={this.state.errorMessage} /> : null}
                    <Toast onClose={() => onClose(this.props.title.toLowerCase())}>
                        <Toast.Header className="handle">
                            {humanReadableSelection(selection)}  {title}
                        </Toast.Header>

                        <Toast.Body>
                            {
                                selectedCell ?
                                    <WikifyForm
                                        selectedCell={selectedCell}
                                        onChange={(key: string, value?: string, instanceOf?: QNode, searchProperties?: boolean) =>
                                            this.handleOnSearch(key, value, instanceOf, searchProperties)}
                                        onSubmit={(qnode: QNode) => this.handleOnSubmit(qnode)}
                                        onCreateQnode = {(entityFields: EntityFields) => this.handleOnCreateNode(entityFields)}
                                        iPopupMenu={true}
                                    />
                            : null
                            }
                        </Toast.Body>
                    </Toast>
                </div>
            </Draggable>
        );
    }


}


export default EditFieldMenu;
