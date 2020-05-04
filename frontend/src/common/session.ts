/* This file contains session related utilities. It will be complete replaced by proper session management in the future */

import { backendGet } from "./comm";

export async function isLoggedIn() {
    try {
        await backendGet('/userinfo');
        return true;
    } catch(error) {
        return false;
    }
}

export async function logout() {
    try {
        await backendGet('/logout');
    } catch(error) {
        // For now, /logout redirects to a page that will always return an error
        // So just ignore it.
    }
    window.location.href = '/';
}