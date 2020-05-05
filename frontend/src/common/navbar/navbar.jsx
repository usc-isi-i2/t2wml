import React, { Component } from "react";
import { Image, Nav, Navbar, NavDropdown } from 'react-bootstrap';

// icons
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faUser } from '@fortawesome/free-solid-svg-icons'

import T2WMLLogo from './T2WMLLogo';

// todo: add it when adding type script
// interface NavbarProperteis {
//   userData: any;
//   loginPage?: true;

//   onShowSettingsClicked: Function;
//   handleLogout: Function;
// }

// interface NavbarState {
// }


class T2wmlNavbar extends Component { //<NavbarProperteis, NavbarState> {
  render() {
    return (
      <div>
        {/* navbar */}
        <Navbar className="shadow" bg="dark" sticky="top" variant="dark" style={{ height: "50px" }}>

          {/* logo */}
          <T2WMLLogo />
          
          {/* avatar */}
          {(!this.props.loginPage) ?
          
          <Nav className="ml-auto">
            <NavDropdown alignRight title={
              <Image src={this.props.userData.picture} style={{ width: "30px", height: "30px" }} rounded />}>

              {/* user info */}
              <NavDropdown.Item style={{ color: "gray" }} disabled>
                <div style={{ fontWeight: "bold" }}>
                  <FontAwesomeIcon icon={faUser} />&nbsp;{this.props.userData.name}
                </div>
                <div>
                  {this.props.userData.email}
                </div>
              </NavDropdown.Item>

              {/* settings */}
              <NavDropdown.Divider />
              <NavDropdown.Item onClick={this.props.onShowSettingsClicked}>
                Settings
            </NavDropdown.Item>

              {/* log out */}
              <NavDropdown.Divider />
              <NavDropdown.Item onClick={ this.props.handleLogout} style={{ color: "hsl(0, 100%, 30%)" }}>
                Log out
            </NavDropdown.Item>

            </NavDropdown>
          </Nav> : null }

        </Navbar>
      </div>
    );
  }
}

export default T2wmlNavbar;
