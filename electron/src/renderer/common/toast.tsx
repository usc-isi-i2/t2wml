import React, { Component } from 'react';

import { Toast } from 'react-bootstrap';
import { ErrorMessage } from './general';

// TODO: Reorganize toasts
 
interface ToastProperties {
    message: ErrorMessage | string;
}

interface ToastState {
    show: boolean;
}

class ToastMessage extends Component<ToastProperties, ToastState> {
    constructor(props: ToastProperties) {
        super(props);

        this.state = {
            show: true,
        };
    }

    render() {
        return (
        <div 
        aria-live="polite"
        aria-atomic="true">
            {(this.props.message as ErrorMessage).errorDescription ? 
            <Toast onClose={() => this.setState({ show: false })} show={this.state.show} delay={8000} autohide
                style={{
                position: 'absolute',
                zIndex: 999,
                top: 0,
                right: '40%',
                minHeight: '100px',
                minWidth: '300px',
                background: 'pink',
                }}
            >
                <Toast.Header>
                    <strong className="mr-auto">{(this.props.message as ErrorMessage).errorTitle}</strong>
                    <small>{new Date().getHours()}:{new Date().getMinutes()}</small>
                </Toast.Header>
                <Toast.Body>{(this.props.message as ErrorMessage).errorDescription}</Toast.Body>
            </Toast> : 
            <Toast onClose={() => this.setState({ show: false })} show={this.state.show} delay={8000} autohide
                style={{
                position: 'absolute', 
                zIndex: 999,
                top: 0,
                right: '40%',
                maxHeight: '100px',
                maxWidth: '300px',
                background: 'light-green',
                }}
            >
                <Toast.Header>
                    <strong className="mr-auto">Properties</strong>
                    <small>{new Date().getHours()}:{new Date().getMinutes()}</small>
                </Toast.Header>
                <Toast.Body>{this.props.message}</Toast.Body>
            </Toast>}
        </div>
    )}
}

export default ToastMessage;
