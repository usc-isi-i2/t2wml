import React from 'react';

// T2WMLLogo
import { Navbar, OverlayTrigger, Tooltip } from 'react-bootstrap';

class T2WMLLogo extends React.Component {
  constructor(props) {
    super(props);

    const server = "http://localhost:5000";

    // init state
    this.state = {
      logo: "T2WML GUI",
      version: "v1.5 (beta)",
      homeUrl: server + "/",
    }
  }

  render() {
    const { logo, version, homeUrl } = this.state;
    const logoTooltipHtml = (
      <Tooltip style={{ width: "fit-content" }}>
        <span className="text-left">
          Table to Wikidata<br />
          Mapping Language
        </span>
      </Tooltip>
    );
    return (
      <span>
        <OverlayTrigger overlay={logoTooltipHtml} placement="bottom" trigger="hover">
          <Navbar.Brand className="pl-2" style={{ cursor: "pointer", fontWeight: "bold" }} onClick={() => { window.location.href = homeUrl; }}>
            {logo}
          </Navbar.Brand>
        </OverlayTrigger>
        <Navbar.Text className="pr-2" style={{ cursor: "default" }}>
          {version}
        </Navbar.Text>
      </span>
    );
  }
}

export default T2WMLLogo;