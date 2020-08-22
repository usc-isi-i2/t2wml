import React from 'react';
import Config from '@/shared/config';
import './Splash.css';

interface State {
    version: string;
    backend: string;
    devMode: boolean;
}

class Splash extends React.Component<never, State> {
    constructor(props: never) {
        super(props);

        this.state = {
            version: Config.version,
            backend: Config.backend,
            devMode: Config.mode === 'dev',
        }
    }

    render() {
        const modeMessage = this.state.devMode ? 'Running in Development Mode' : '';
        const message = this.state.devMode ? 'Please run the backend' : 'Waiting for backend to start';

        return (
            <div id='splash'>
                <h4>T2WML { this.state.version }</h4>
                <div id="mode">
                    { modeMessage }
                </div>
                <div id="message">
                    { message }
                </div>
            </div>
        );
    }
}

export default Splash;