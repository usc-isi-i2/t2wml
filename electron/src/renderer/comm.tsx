import * as React from 'react';

interface CommState {
    message: string;
}

export class Comm extends React.Component<{}, CommState> {
    constructor(props: {}) {
        super(props);
        this.state = { 
            message: '',
        };
    }

    async componentDidMount() {
        while (true) {
            try {
                const response = await fetch('http://localhost:5555');
                const data = await response.json();
                console.log('Got response ', data);
                this.setState({ message: data.message });
                break;
            } catch(err) {
                console.warn(err);
                this.setState( { message: '...'} );
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }
    }

    render() {
        return <h2>Message from server: { this.state.message }</h2>
    }
}