import React, { Component } from 'react';
import { observer } from "mobx-react"
// import './project.css';
import Draggable from 'react-draggable';
import { Card, Modal, ModalDialog, Toast } from 'react-bootstrap';

class DraggableModalDialog extends React.Component {
    render() {
        return <Draggable handle=".modal-title"><ModalDialog {...this.props} /></Draggable>
    }
}

@observer
class EntityMenu extends Component<{ showEntityMenu: boolean, handler: () => void }, { show: boolean }> {

    constructor(props: any) { //: {showEntityMenu: boolean}
        super(props);
    }

    render() {
        const title = "Title";
        const { showEntityMenu, } = this.props;
        return (
            // <Modal dialogComponent={DraggableModalDialog} onHide={() => this.props.handler()} show={showEntityMenu}>
            //     <Modal.Header closeButton>
            //         <Modal.Title>
            //             {title}
            //         </Modal.Title>
            //     </Modal.Header>
            //     <Modal.Body>
            //         Lorem ipsum dolor sit amet, consectetur adipisicing elit. Et voluptatibus dolor dicta accusantium nisi molestias facere nam beatae debitis perspiciatis? Laboriosam fuga veniam autem dolor fugit totam accusamus deserunt possimus!
            //     </Modal.Body>
            // </Modal>
            <Draggable handle=".handle"
            // defaultPosition={{x: position[0], y: position[1]}}
            >
                <div className="output-menu">
                    <Toast onClose={() => this.props.handler()}>
                        <Toast.Header className="handle">
                            {title}
                        </Toast.Header>

                        <Toast.Body>
                            Lorem ipsum dolor sit amet, consectetur adipisicing elit. Quam ipsa at quibusdam vel! Assumenda iure obcaecati, doloribus reprehenderit distinctio quasi aliquam explicabo iusto blanditiis. Et possimus dignissimos quisquam sapiente veritatis?
                    </Toast.Body>
                    </Toast>
                </div>
            </Draggable>
        );
    }
}

export default EntityMenu;