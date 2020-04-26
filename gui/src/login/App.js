import React from 'react';
import './App.css';
import { GOOGLE_CLIENT_ID } from '../privacy.js';
import { DEFAULT_BACKEND_SERVER } from '../config.js';
import T2WMLLogo from '../index/T2WMLLogo'

// icons
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faFacebookF, faGithub, faGoogle, faLinkedinIn, faTwitter } from '@fortawesome/free-brands-svg-icons'

// App
import { Button, Card, Navbar } from 'react-bootstrap';
import { GoogleLogin } from 'react-google-login';
// import { GoogleLogin, GoogleLogout } from 'react-google-login';

// console.log
const LOG = {
  default: "background: ; color: ",
  highlight: "background: yellow; color: black",
  link: "background: white; color: blue"
};

class App extends React.Component {
  constructor(props) {
    super(props);

    // init global variables
    window.server = DEFAULT_BACKEND_SERVER;

    // init state
    this.state = {

      // none

    };
  }

  onGoogleFailure(googleUser) {
    console.log(googleUser);
    alert("Login failed!\n\nError: " + googleUser.error);
  }

  onGoogleSuccess(googleUser) {
    // send request
    console.log("<App> -> %c/login%c to verify id_token", LOG.link, LOG.default);
    let formData = new FormData();
    formData.append("source", "Google");
    formData.append("token", googleUser.getAuthResponse().id_token);
    fetch(window.server + "/login", {
      mode: "cors",
      body: formData,
      method: "POST"
    }).then(response => {
      if (!response.ok) throw Error(response.statusText);
      return response;
    }).then(response => {
      return response.json();
    }).then(json => {
      console.log("<App> <- %c/login%c with:", LOG.link, LOG.default);
      console.log(json);

      // do something here
      if (json["vs"]) {
        // successful verification
        window.location.href = window.server + "/project";
      } else {
        // failed verification
        alert("Login failed!\n\nError: " + json["error"]);
      }

    }).catch((error) => {
      console.log(error);
      alert("Login failed!\n\n" + error);
    });
  }

  render() {
    return (
      <div>

        {/* navbar */}
        <div>
          <Navbar className="shadow" bg="dark" variant="dark" sticky="top" style={{ height: "50px" }}>

            {/* logo */}
            <T2WMLLogo />

          </Navbar>
        </div>

        {/* content */}
        <div style={{ height: "calc(100vh - 50px)", background: "#f8f9fa", paddingTop: "20px" }}>
          <Card className="shadow-sm" style={{ width: "90%", maxWidth: "400px", height: "", margin: "0 auto" }}>
            <Card.Header style={{ height: "40px", padding: "0.5rem 1rem", background: "#343a40" }}>
              <div
                className="text-white font-weight-bold d-inline-block text-truncate"
                style={{ width: "100%", cursor: "default" }}
              >
                Welcome
              </div>
            </Card.Header>
            <Card.Body style={{ padding: "10% 10%", overflowY: "auto" }}>

              {/* Visitor */}
              <Button
                variant="outline-dark"
                style={{ width: "100%", marginBottom: "10%" }}
                // onClick={renderProps.onClick}
                disabled
              >
                <span style={{ width: "90%", display: "inline-block", fontWeight: "bold" }}>Continue as a visitor</span>
              </Button>

              {/* Google */}
              <GoogleLogin
                clientId={GOOGLE_CLIENT_ID} // @J
                render={renderProps => (
                  <Button
                    variant="success"
                    style={{ width: "100%" }}
                    onClick={renderProps.onClick}
                    disabled={renderProps.disabled}
                  >
                    <FontAwesomeIcon icon={faGoogle} />
                    <span style={{ width: "90%", display: "inline-block", fontWeight: "bold" }}>Log in with Google</span>
                  </Button>
                )}
                buttonText="Login"
                onSuccess={this.onGoogleSuccess.bind(this)}
                onFailure={this.onGoogleFailure.bind(this)}
                cookiePolicy={'single_host_origin'}
                // uxMode="redirect" // make google sign-in at the same page
                // redirectUri={window.location.href} // make google sign-in at the same page
              />
            </Card.Body>
          </Card>
        </div>
      </div>
    );
  }
}

export default App;
