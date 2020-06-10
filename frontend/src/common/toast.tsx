import React, { Component } from 'react';

import { Toast } from 'react-bootstrap';
import { ErrorMessage } from './general';

interface ToastProperties {
    message: ErrorMessage;
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
        aria-atomic="true"
        style={{
            position: 'relative',
            minHeight: '100px',
        }}
        >
        <Toast onClose={() => this.setState({ show: false })} show={this.state.show} delay={8000} autohide
            style={{
            position: 'absolute',
            top: 0,
            right: 0,
            minHeight: '100px',
            minWidth: '300px',
            background: 'pink',
            }}
        >
            <Toast.Header>
                <strong className="mr-auto">{this.props.message.errorTitle}</strong>
                <small>{new Date().getHours()}:{new Date().getMinutes()}</small>
            </Toast.Header>
            <Toast.Body>{this.props.message.errorDescription}</Toast.Body>
        </Toast>
        </div>
    )};
}

export default ToastMessage;
