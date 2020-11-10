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
        let style = {
            position: 'absolute',
            zIndex: 999,
            top: 0,
            right: '40%',
            maxHeight: '100px',
            maxWidth: '300px',
            background: 'light-green'
        }
        let message;
        let title = "";
        
        if ((this.props.message as ErrorMessage).errorDescription) {
            style['background'] = 'pink'
            message = (this.props.message as ErrorMessage).errorDescription;
            title = (this.props.message as ErrorMessage).errorTitle;
        } else {
            message = this.props.message;
        }

        return (
            <div
                aria-live="polite"
                aria-atomic="true">
                <Toast onClose={() => this.setState({ show: false })}
                    show={this.state.show}
                    delay={8000}
                    autohide
                    style={style as React.CSSProperties}
                >
                    <Toast.Header>
                        <strong className="mr-auto">{title}</strong>
                        <small>{new Date().getHours()}:{new Date().getMinutes()}</small>
                    </Toast.Header>
                    <Toast.Body>{message}</Toast.Body>
                </Toast>
            </div>
        )
    }
}

export default ToastMessage;
