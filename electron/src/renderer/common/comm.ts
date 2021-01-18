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
      throw {
        errorCode: response.status,
        errorTitle: `${method} failed. ${(response as any).data.error.errorTitle}`,
        errorDescription: (response as any).data.error.errorDescription,
      } as ErrorMessage;
  }
  return (response as any).data;
}


export async function backendGet(url: string): Promise<any> {
  let response: Response;
  try {
    response = await instance.get(url);
  } catch (error) {
    return getResponse(error.response, "Get");
  }

  return getResponse(response, "Get");
}


export async function backendPost(
  url: string,
  data?: any
): Promise<any> {
  let response: Response;
  try {
    response = await instance.post(url, data);
  } catch (error) {
    return getResponse(error.response, "Post");
  }

  return getResponse(response, "Post");
}


export async function backendPut(
  url: string,
  data?: any
): Promise<any> {
  let response: Response;
  try {
    response = await instance.put(url, data);
  } catch (error) {
    return getResponse(error.response, "Put");
  }

  return getResponse(response, "Put");
}
