import React from 'react';
import Config from '@/shared/config';
import wikiStore from '../../data/store';
import logoImage from '@/images/t2wml logo2_80x80.png';
import './T2WMLLogo.css';

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
      logo: "T2WML",
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
          <Navbar.Brand className="pl-2" style={{ cursor: "pointer", fontWeight: "bold" }} onClick={() => { wikiStore.changeProject(); }}>
            <img src={logoImage} />
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