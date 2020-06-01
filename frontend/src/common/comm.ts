/* Communications with the backend server */

import Config from "./config";

function getUrl(url: string) {
    console.debug('Config.backend: ', Config.backend);
    if (url[0] === '/') {
        return Config.backend + url.substring(1);
    }

    return Config.backend + url;
}

export async function backendGet(url: string): Promise<any> {
    const response = await fetch(getUrl(url), {
        mode: "cors",
        method: "GET",
        credentials: "include",
    });

    if (!response.ok) {
        throw Error(response.statusText);
    }
    const json = await response.json();

    return json;
}

export async function backendPost(url: string, formData?: FormData): Promise<any> {
    const fullUrl = getUrl(url);
    console.debug('Fetching from ', fullUrl);
    const response = await fetch(fullUrl, {
        mode: "cors",
        method: "POST",
        body: formData,
        credentials: "include",
    });

    if (!response.ok) {
        throw Error(response.statusText);
    }
    const json = await response.json();

    return json;
}
