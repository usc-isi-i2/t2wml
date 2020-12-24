/* Communications with the backend server */

import Config from "@/shared/config";
import axios from "axios";
import { ErrorMessage } from "./general";


const instance = axios.create({
  withCredentials: true,
  headers: {
    'Access-Control-Allow-Origin': '*',
  },
  baseURL: `${Config.backend}/api/`
});


function getResponse(response: Response, method: string): Promise<any> {
  if (response.statusText !== "OK" && response.statusText !== "CREATED") {
    if (response.status === 401) {
      // Unauthorized
      throw {
        errorCode: response.status,
        errorTitle: response.statusText,
        errorDescription: `${method} failed`,
      } as ErrorMessage;
    }
    throw (response as any).error; // Error class from backend (code, title, description)
  }
  return (response as any).data;
}


export async function backendGet(url: string): Promise<any> {
  let response: Response;
  try {
    response = await instance.get(url);
  } catch (error) {
    // no connection error
    throw {
      errorTitle: error.message,
      errorDescription: "Connection error.",
    } as ErrorMessage;
  }

  return await getResponse(response, "Get");
}


export async function backendPost(
  url: string,
  data?: any
): Promise<any> {
  let response: Response;
  try {
    response = await instance.post(url, data);
  } catch (error) {
    throw {
      errorTitle: error.message,
      errorDescription: "Connection error.",
    } as ErrorMessage;
  }

  return await getResponse(response, "Post");
}


export async function backendPut(
  url: string,
  data?: any
): Promise<any> {
  let response: Response;
  try {
    response = await instance.put(url, data);
  } catch (error) {
    throw {
      errorTitle: error.message,
      errorDescription: "Connection error.",
    } as ErrorMessage;
  }

  return await getResponse(response, "Put");
}
