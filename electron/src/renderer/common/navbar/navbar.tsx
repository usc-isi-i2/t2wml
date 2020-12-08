import React, { Component } from "react";
import { Navbar } from 'react-bootstrap';
import T2WMLLogo from './T2WMLLogo';
// icons
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCogs} from '@fortawesome/free-solid-svg-icons'


interface NavbarProperteis {
  showSettings?: boolean;
  name?: string;

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

          {/* name */}
          <Navbar.Text className="pr-2" style={{ cursor: "default", fontWeight: 'bold', right: '50%', position: 'absolute' }}>
            {this.props.name}
          </Navbar.Text>

        </Navbar>
      </div>
    );
  }
}


export default T2wmlNavbar;
