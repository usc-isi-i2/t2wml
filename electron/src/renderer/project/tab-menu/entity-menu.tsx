import React, { Component } from 'react';
import { observer } from "mobx-react"
import Draggable from 'react-draggable';
import { Toast } from 'react-bootstrap';
import './entity-menu.css'
import  './cell-tab/wikify-menu.css'

import { CellSelection, ErrorMessage } from '@/renderer/common/general';
import { EntityFields, QNode } from '@/renderer/common/dtos';
import { humanReadableSelection } from '../table/table-utils';
import RequestService, { IStateWithError } from '@/renderer/common/service';
import ToastMessage from '@/renderer/common/toast';
import WikifyForm from './cell-tab/wikify-form';
import wikiStore from '@/renderer/data/store';

interface EntityMenuState extends IStateWithError {
}

interface EntityMenuProps {
    onClose: (key:string, entityFields?: EntityFields) => void,
    selection: CellSelection,
    title: string,
    data_type?: string,
    // showResults: boolean,
    onSelectNode: (key: string, value?: QNode) => void,
}

@observer
class EntityMenu extends Component<EntityMenuProps, EntityMenuState> {

    private requestService: RequestService;
    private timeoutSearch?: number;


    constructor(props: any) {
        super(props);

        this.requestService = new RequestService();

        // const { title, data_type } = this.props;
        // const is_property = title?.toLowerCase() === "property";
        this.state = {
            errorMessage: {} as ErrorMessage,
            // entityFields: {
            //     is_property: is_property,
            //     label: "",
            //     description: "",
            //     data_type: data_type ? data_type.toLowerCase().replaceAll(' ', '') : "string"
            // },
            // searchText: ""
        }
    }

    // handleOnChange(event: KeyboardEvent, key: "label" | "description" | "data_type" | "is_property") {
    //     if (event.code === 'Enter') {
    //         event.preventDefault();
    //         this.handleOnSubmit();
    //     }
    //     const value = (event.target as HTMLInputElement).value;
    //     const updatedEntityFields = { ...this.state.entityFields };
    //     switch (key) {
    //         case "is_property": {
    //             updatedEntityFields.is_property = !updatedEntityFields.is_property
    //             break;
    //         }
    //         default: {
    //             (updatedEntityFields as any)[key] = value;
    //             break;
    //         }
    //     }
    //     this.setState({ entityFields: updatedEntityFields });
    // }


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
        // const { entityFields, searchText } = this.state;
        const { onClose, selection, title } = this.props;
        const position = { x: window.innerWidth * 0.10, y: 0 };

        const selectedCell = wikiStore.table.selectedCell;
        return (
            <Draggable handle=".handle"
                defaultPosition={position}>
                <div className="entity-menu">
                    {this.state.errorMessage.errorDescription ? <ToastMessage message={this.state.errorMessage} /> : null}
                    <Toast onClose={() => onClose(this.props.title.toLowerCase())}>
                        <Toast.Header className="handle">
                            {humanReadableSelection(selection)}  {title}
                        </Toast.Header>

                        <Toast.Body className="wikify-menu ">
                            {
                                selectedCell ?

                                    <WikifyForm
                                        selectedCell={selectedCell}
                                        onChange={(key: string, value?: string, instanceOf?: QNode, searchProperties?: boolean) =>
                                            this.handleOnSearch(key, value, instanceOf, searchProperties)}
                                        onSubmit={(qnode: QNode) => this.handleOnSubmit(qnode)}
                                        // onRemove={}//(qnode: QNode, applyToBlock: boolean) => Promise < void>
                                        onCreateQnode = {(entityFields: EntityFields) => this.handleOnCreateNode(entityFields)}
                                        iPopupMenu={true}
                                    />
                            : null
                            }

                            {/* <Button variant="primary" type="button" onClick={() => this.handleOnSubmit()}
                                disabled={!isValidLabel(entityFields.label)}>
                                Save
                            </Button> */}
                        </Toast.Body>
                    </Toast>
                </div>
            </Draggable>
        );
    }


}


export default EntityMenu;
