import React, { Component } from 'react';

import { Toast } from 'react-bootstrap';
import { ErrorMessage } from './general';

interface ToastProperties {
    message: ErrorMessage;
}

class ToastMessage extends Component<ToastProperties, {}> {
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
        <Toast
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
                <img src="holder.js/20x20?text=%20" className="rounded mr-2" alt="" />
                <strong className="mr-auto">{this.props.message.errorTitle}</strong>
                <small>{new Date().getHours()}:{new Date().getMinutes()}</small>
            </Toast.Header>
            <Toast.Body>{this.props.message.errorDescription}</Toast.Body>
        </Toast>
        </div>
    )};
}

export default ToastMessage;
