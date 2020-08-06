/* Communications with the backend server */

import Config from "./config";
import { ErrorMessage } from "./general";

function getUrl(url: string) {
    console.debug('Config.backend: ', Config.backend);
    if (url[0] === '/') {
        return Config.backend + url.substring(1);
    }

    return Config.backend + url;
}

async function getResponse(response: Response, method: string): Promise<any> {
    if (!response.ok) {
        if (response.status === 401) { // Unauthorized
            // eslint-disable-next-line        
            throw ({
                errorCode: response.status,
                errorTitle: response.statusText,
                errorDescription: `${method} failed`
            } as ErrorMessage);
        }
        throw ((await response.json() as any).error); // Error class from backend (code, title, description)
    }

    const json = await response.json();
    return json;
}

export async function backendGet(url: string): Promise<any> {
    let response: Response;
    try {
        response = await fetch(getUrl(url), {
            mode: "cors",
            method: "GET",
            credentials: "include",
        });
    } catch (error) { // no connection error
        // eslint-disable-next-line        
        throw ({
            errorTitle: error.message,
            errorDescription: 'Connection error.'
        } as ErrorMessage);
    }

    return await getResponse(response, 'Get');
}

export async function backendPost(url: string, formData?: FormData): Promise<any> {
    let response: Response;
    try {
        response = await fetch(getUrl(url), {
            mode: "cors",
            method: "POST",
            body: formData,
            credentials: "include",
        });

    } catch (error) {
        // eslint-disable-next-line        
        throw ({
            errorTitle: error.message,
            errorDescription: 'Connection error.'
        } as ErrorMessage);
    }

    return await getResponse(response, 'Post');
}

export async function backendPut(url: string, formData?: FormData): Promise<any> {
    let response: Response;
    try {
        response = await fetch(getUrl(url), {
            mode: "cors",
            method: "PUT",
            body: formData,
            credentials: "include",
        });
    } catch (error) {
        // eslint-disable-next-line        
        throw ({
            errorTitle: error.message,
            errorDescription: 'Connection error.'
        } as ErrorMessage);
    }

    return await getResponse(response, 'Put');
}

export async function backendDelete(url: string): Promise<any> {
    let response: Response;
    try {
        response = await fetch(getUrl(url), {
            mode: "cors",
            method: "DELETE",
            credentials: "include",
        });
    } catch (error) {
        // eslint-disable-next-line        
        throw ({
            errorTitle: error.message,
            errorDescription: 'Connection error.'
        } as ErrorMessage);
    }

    return await getResponse(response, 'Delete');
}
