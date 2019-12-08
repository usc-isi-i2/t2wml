import React from 'react';
import ReactDOM from 'react-dom';
import '../index/index.css';
import App from './App';
import * as serviceWorker from '../serviceWorker';

// Change mode as "deploy" / "develop"
const mode = "develop";

let pid, userData;
if (mode === "deploy") {
    const flaskData = document.getElementById("flaskData");
    pid = flaskData.getAttribute("pid");
    userData = JSON.parse(flaskData.getAttribute("userData"));
} else if (mode === "develop") {
    pid = "test_pid";
    userData = JSON.parse('{"name": "\u5434\u5609\u76db", "email": "js.wuuuu@gmail.com", "picture": "https://lh5.googleusercontent.com/-9K8u_XVuUWU/AAAAAAAAAAI/AAAAAAAAAAA/ACHi3rf_bwouL7F2TEWMFulE05uEQLiFmQ/s96-c/photo.jpg", "givenName": "\u5609\u76db", "familyName": "\u5434"}')
}

ReactDOM.render(<App pid={pid} userData={userData} />, document.getElementById('root'));

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();
