import React, { Component } from 'react';
import { observer } from "mobx-react"
// import './project.css';
import Draggable from 'react-draggable';
import { Button, Toast } from 'react-bootstrap';
import './entity-menu.css'
import * as utils from './table-utils';
import { CellSelection } from '@/renderer/common/general';
import EntityForm from './entity-form';

interface EntityMenuState {
    entityFields: {
    isProperty: boolean;
    label: string;
    description: string;
    datatype: string;
    }
}

@observer
class EntityMenu extends Component<{ onClose: () => void, selection: CellSelection }, EntityMenuState> {

    constructor(props: any) {
        super(props);
        this.state = {
            entityFields:{
                isProperty: true,
                label: "",
                description: "",
                datatype: "string"
            }
        }
    }

    handleOnChange(event: KeyboardEvent, key: "label" | "description" | "data_type" | "is_property") {
        if (event.code === 'Enter') {
            event.preventDefault();
            this.handleOnSubmit();
        }
        const value = (event.target as HTMLInputElement).value;
        
        console.log(key, value)
        // const updatedFields = { ...this.state.fields }
        // updatedFields[key as keyof AnnotationFields] = value;
        // this.changed = true;

        // this.setState({ fields: updatedFields }, () => {
        //   if (this.timeoutId) {
        //     window.clearTimeout(this.timeoutId);
        //   }
        //   this.timeoutId = window.setTimeout(() => {
        //     let { type } = this.state.fields;
        //     if (key === 'unit' || key === 'property') {
        //       this.setState({ showResult1: true, showResult2: false })
        //     }
        //     if (!type) { type = "string"; }
        //     this.handleOnPropertyUnit(key, value, type);
        //   }, 300);
        // });
    }


    handleOnSubmit() {
        console.log(this.state);
        this.props.onClose();
    }

    render() {
        const { entityFields } = this.state;
        const { onClose, selection } = this.props;
        const position = { x: window.innerWidth * 0.10, y: 0 };
        return (
            <Draggable handle=".handle"
                defaultPosition={position}>
                <div className="entity-menu">
                    <Toast onClose={onClose}>
                        <Toast.Header className="handle">
                            {utils.humanReadableSelection(selection)}
                        </Toast.Header>

                        <Toast.Body>
                            <EntityForm 
                            entityFields = {entityFields}
                            handleOnChange={() => this.handleOnChange.bind(this)}
                            />
                            <Button variant="primary" type="button" onClick={() => this.handleOnSubmit()}>
                                Save
                            </Button>
                        </Toast.Body>
                    </Toast>
                </div>
            </Draggable>
        );
    }
}

export default EntityMenu;