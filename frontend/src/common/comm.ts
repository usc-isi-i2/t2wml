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
        if (response.status === 401) { // Unauthorized. what about failed, no connection error?
            throw ({errorCode: response.status,
                errorTitle: response.statusText,
                errorDescription: `${method} failed`} as ErrorMessage);
        }  
        throw ((await response.json() as any).error);
    }

    const json = await response.json();
    return json;
}

export async function backendGet(url: string): Promise<any> {
    const response = await fetch(getUrl(url), {
        mode: "cors",
        method: "GET",
        credentials: "include",
    });

    return await getResponse(response, 'Get');
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

    return await getResponse(response, 'Post');
}

export async function backendPut(url: string, formData?: FormData): Promise<any> {
  const fullUrl = getUrl(url);
  console.debug('Fetching from ', fullUrl);
  const response = await fetch(fullUrl, {
      mode: "cors",
      method: "PUT",
      body: formData,
      credentials: "include",
  });

  return await getResponse(response, 'Put');
}

export async function backendDelete(url: string): Promise<any> {
  const fullUrl = getUrl(url);
  console.debug('Fetching from ', fullUrl);
  const response = await fetch(fullUrl, {
      mode: "cors",
      method: "DELETE",
      credentials: "include",
  });

  return await getResponse(response, 'Delete');
}
