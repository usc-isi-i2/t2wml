import React, { Component } from "react";
import { Navbar } from 'react-bootstrap';
import T2WMLLogo from './T2WMLLogo';


interface NavbarProperteis {
  showSettings?: boolean;

  onShowSettingsClicked?: Function;
}

class T2wmlNavbar extends Component<NavbarProperteis> {
  render() {
    return (
      <div>
        {/* navbar */}
        <Navbar className="shadow" bg="dark" variant="dark" style={{ height: "50px" }}> { /* Move to Navbar.css */ }

            {/* logo */}
            <T2WMLLogo />
          
            {/* settings */}
            {(this.props.showSettings && 
            this.props.onShowSettingsClicked !== undefined) ? 
            <button style={{ position: 'absolute', right: '1rem' }} onClick={this.props.onShowSettingsClicked.bind(this)}>
                Settings
            </button>: null }

        </Navbar>
      </div>
    );
  }
}

export default T2wmlNavbar;
