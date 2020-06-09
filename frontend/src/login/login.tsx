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
import RequestService from '../common/service';

// console.log
import { LOG, ErrorMessage } from '../common/general';
import ToastMessage from '../common/toast';

interface LoginState {
    errorMessage: ErrorMessage;
}

class Login extends React.Component<{}, LoginState> {
  private requestService: RequestService;
  constructor(props: {}) {
      super(props)
      this.requestService = new RequestService();

      this.state = {
          errorMessage: {} as ErrorMessage,
      };
  }

  async componentDidMount() {
    document.title = "T2WML - Login";

    // Check if user is logged in. If so - redirect to project list
    try {
      await this.requestService.getUserInfo();
      window.location.href = '/projects';
    } catch(e) {
      // Don't do anything here, just log in as usual.
    }
  }

  onGoogleFailure(googleUser: any) {
    console.log(googleUser);
    alert("Login failed!\n\nError: " + googleUser.error);
  }

  onGoogleSuccess(googleUser: GoogleLoginResponse | GoogleLoginResponseOffline) {
    // send request
    this.setState({ errorMessage: {} as ErrorMessage });
    console.log("<App> -> %c/login%c to verify id_token", LOG.link, LOG.default);
    let formData = new FormData();
    formData.append("source", "Google");
    if (googleUser as GoogleLoginResponse) {
      formData.append("token", (googleUser as GoogleLoginResponse).getAuthResponse()!.id_token);
    }

    this.requestService.login(formData).then(json => {
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

    }).catch((error: ErrorMessage) => {
      console.log(error);
      this.setState({ errorMessage: error });
    //   alert("Login failed!\n\n" + error);
    });
  }

  render() {
    return (
      <div>
        <Navbar loginPage></Navbar>
        {this.state.errorMessage.errorDescription ? <ToastMessage message={this.state.errorMessage}/> : null }

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
