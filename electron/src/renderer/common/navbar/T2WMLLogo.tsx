import React from 'react';
import { Link } from 'react-router-dom';
import Config from '@/shared/config';

// T2WMLLogo
import { Navbar, OverlayTrigger, Tooltip } from 'react-bootstrap';

interface T2WMLLogoState {
  logo: string;
  version: string;
  homeUrl: string;
}


class T2WMLLogo extends React.Component<{}, T2WMLLogoState> {
  constructor(props: {}) {
    super(props);

    // init state
    this.state = {
      logo: "T2WML GUI",
      version: `version ${Config.version}`,
      homeUrl: "/",
    }
  }

  render() {
    const { logo, version } = this.state;
    const logoTooltipHtml = (
      <Tooltip style={{ width: "fit-content" }} id="navbar-tooltip">
        <span className="text-left">
          Table to Wikidata<br />
          Mapping Language
        </span>
      </Tooltip>
    );
    return (
      <span>
        <OverlayTrigger overlay={logoTooltipHtml} placement="bottom" trigger={["hover", "focus"]}>
          <Link to="/">
            <Navbar.Brand className="pl-2" style={{ cursor: "pointer", fontWeight: "bold" }}>
              {logo}
            </Navbar.Brand>
          </Link>
        </OverlayTrigger>
        <Navbar.Text className="pr-2" style={{ cursor: "default" }}>
          {version}
        </Navbar.Text>
      </span>
    );
  }
}

export default T2WMLLogo;