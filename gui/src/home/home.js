import React from 'react';
import ReactDOM from 'react-dom';
import '../index/index.css';
import App from './App';
import * as serviceWorker from '../serviceWorker';

// temp div to fetch data from flask
const flaskData = document.getElementById("flaskData");
const userData = JSON.parse(flaskData.getAttribute("userData"));
// const userData = { uid: "G101783343861319573489", email: "js.wuuuu@gmail.com", name: "吴嘉盛", picture: "https://lh5.googleusercontent.com/-9K8u_XVuUWU/AAAAAAAAAAI/AAAAAAAAAAA/ACHi3rf_bwouL7F2TEWMFulE05uEQLiFmQ/s96-c/photo.jpg", givenName: "嘉盛", familyName: "吴" }

ReactDOM.render(<App userData={userData} />, document.getElementById('root'));

// remove temp div
// flaskData.parentNode.removeChild(flaskData);

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();
