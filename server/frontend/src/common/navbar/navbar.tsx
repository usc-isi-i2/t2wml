import React, { Component, Fragment } from "react";
import { Image, Nav, Navbar, NavDropdown } from 'react-bootstrap';

// icons
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faUser } from '@fortawesome/free-solid-svg-icons'

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
        <Navbar className="shadow" bg="dark" variant="dark" style={{ height: "50px" }}>

            {/* logo */}
            <T2WMLLogo />
          
            {/* settings */}
            {(this.props.showSettings && 
            this.props.onShowSettingsClicked !== undefined) ? 
            <Fragment>
            <NavDropdown.Divider />
            <NavDropdown.Item onClick={this.props.onShowSettingsClicked.bind(this)}>
                Settings
            </NavDropdown.Item>
            </Fragment> : null }

        </Navbar>
      </div>
    );
  }
}

export default T2wmlNavbar;
