import React, { Component, Fragment } from "react";
import { Image, Nav, Navbar, NavDropdown } from 'react-bootstrap';

// icons
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faUser } from '@fortawesome/free-solid-svg-icons'

import T2WMLLogo from './T2WMLLogo';

interface NavbarProperteis {
  userData?: any;
  loginPage?: boolean;
  showSettings?: boolean;

  onShowSettingsClicked?: Function;
  handleLogout?: Function;
}

class T2wmlNavbar extends Component<NavbarProperteis> {

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
            <NavDropdown alignRight id="user-data" title={
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
              {(this.props.showSettings && 
              this.props.onShowSettingsClicked !== undefined) ? 
              <Fragment>
                <NavDropdown.Divider />
                <NavDropdown.Item onClick={this.props.onShowSettingsClicked.bind(this)}>
                  Settings
                </NavDropdown.Item>
              </Fragment> : null }

              {/* log out */}
              {this.props.handleLogout !== undefined ?
              <Fragment>
              <NavDropdown.Divider />
                <NavDropdown.Item onClick={this.props.handleLogout.bind(this)} style={{ color: "hsl(0, 100%, 30%)" }}>
                  Log out
                </NavDropdown.Item>
              </Fragment> : null}

            </NavDropdown>
          </Nav> : null }

        </Navbar>
      </div>
    );
  }
}

export default T2wmlNavbar;
