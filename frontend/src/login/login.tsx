import React from 'react';
import './login.css';
import Navbar from '../common/navbar/navbar';
import Config from '../common/config';

// icons
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGoogle } from '@fortawesome/free-brands-svg-icons';

// App
import { Button, Card } from 'react-bootstrap';
import { GoogleLogin, GoogleLoginResponse, GoogleLoginResponseOffline } from 'react-google-login';
import { backendPost, backendGet } from '../common/comm';

// console.log
const LOG = {
  default: "background: ; color: ",
  highlight: "background: yellow; color: black",
  link: "background: white; color: blue"
};

class Login extends React.Component {

  async componentDidMount() {
    document.title = "T2WML - Login";

    // Check if user is logged in. If so - redirect to project list
    try {
      await backendGet('/userinfo');
      window.location.href = '/projects';
    } catch(e) {
      // Don't do anything here, just log in as usual.
    }
  }

  onGoogleFailure(googleUser: any) {
    console.log(googleUser);
    alert("Login failed!\n\nError: " + googleUser.error);
  }

  onGoogleSuccess(googleUser: any) {// GoogleLoginResponse | GoogleLoginResponseOffline) { // TODO: add the correct type
    // send request
    console.log("<App> -> %c/login%c to verify id_token", LOG.link, LOG.default);
    let formData = new FormData();
    formData.append("source", "Google");
    if (googleUser as GoogleLoginResponse) { // Maybe split to 2 functions?
      formData.append("token", googleUser.getAuthResponse()!.id_token);
    }
    backendPost('login', formData).then(json => {
      console.log("<App> <- %c/login%c with:", LOG.link, LOG.default);
      console.log(json);

      // do something here
      if (json["vs"]) {
        // successful verification
        window.location.href = "/projects";
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
        <Navbar loginPage></Navbar>

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
                clientId={Config.googleClientId} // @J
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

export default Login;
