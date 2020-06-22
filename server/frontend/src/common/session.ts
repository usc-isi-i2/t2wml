/* This file contains session related utilities. It will be complete replaced by proper session management in the future */

import RequestService from "./service";

const requestService = new RequestService();

export async function isLoggedIn() {  
    try {
        await requestService.getUserInfo();
        return true;
    } catch(error) {
        return false;
    }
}

export async function logout() {
    try {
        await requestService.logout();
    } catch(error) {
        // For now, /logout redirects to a page that will always return an error
        // So just ignore it.
    }
    window.location.href = '/';
}