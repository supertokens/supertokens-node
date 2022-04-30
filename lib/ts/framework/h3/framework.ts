import { createError, H3Event, sendError } from 'h3';
import type {IncomingMessage, ServerResponse} from 'http';
import { SessionContainerInterface } from '../../recipe/session/types';
import SuperTokens from '../../supertokens';
import { normaliseHttpMethod } from "../../utils";
import { BaseRequest } from "../request";
import { BaseResponse } from '../response';
import { Framework } from '../types';
import {
    getCookieValueFromIncomingMessage, getHeaderValueFromIncomingMessage, useBody, useRawBody, setCookieForServerResponse
} from "../utils";

export class H3Request extends BaseRequest {
    private request: IncomingMessage;
    constructor(request: IncomingMessage) {
        super();
        this.original = request;
        this.request = request;
    };
    getCookieValue = (key: string) => {
        return getCookieValueFromIncomingMessage(this.request, key);
    };
    getFormData = async (): Promise<any> => {
        return useRawBody(this.request);
    };
    getMethod = () => {
        return normaliseHttpMethod(this.request.method!)
    };
    getHeaderValue = (key: string) => {
        return getHeaderValueFromIncomingMessage(this.request, key);
    };
    getOriginalURL = () => {
        return this.request.url!
    };
    getKeyValueFromQuery = (key: string) => {
        let path = this.request.url || "/"
        const queryIndex = path.lastIndexOf('?')
        if(queryIndex > -1) {
            const queryArray = path.substring(queryIndex + 1, path.length).split('&');
            const index = queryArray.findIndex(el => el.includes(key));
            if(index === -1) return undefined;
            const value = queryArray[index].split('=')[1]
            if(value === undefined || typeof value !== 'string') {
                return undefined
            }
            return value;
        } else {
           return undefined;
        }
    }
    getJSONBody = async () => {
        return await useBody(this.request);
    };
}

export class H3ResponseTokens extends BaseResponse {
    private response: ServerResponse;
    private statusCode: number;
    constructor(response: ServerResponse) {
        super();
        this.original = response;
        this.response = response;
        this.statusCode = 200
    }

    sendHTMLResponse = (html: string) => {
        if(this.response.writable) {
            this.response.setHeader('Content-Type', 'text/html')
            this.response.statusCode = this.statusCode;
            this.response.end(html);
        }
    };
    setHeader = (key: string, value: string, allowDuplicateKey: boolean) => {
        try { 
            const allheaders = this.response.getHeaders();
            let existingValue = allheaders[key];

            // we have the this.response.header for compatibility with nextJS
            if (existingValue === undefined) {
                this.response.setHeader(key, value);
            } else if (allowDuplicateKey) {
                this.response.setHeader(key, existingValue + ", " + value);
            } else {
                // we overwrite the current one with the new one
                this.response.setHeader(key, value);
            }
        } catch (err) {
            throw new Error("Error while setting header with key: " + key + " and value: " + value);
        }
    };
    setCookie = (
        key: string,
        value: string,
        domain: string | undefined,
        secure: boolean,
        httpOnly: boolean,
        expires: number,
        path: string,
        sameSite: "strict" | "lax" | "none"
    ) => {
        setCookieForServerResponse(this.response, key, value, domain, secure, httpOnly, expires, path, sameSite);
    };
    setStatusCode = (statusCode: number) => {
        if(this.response.writable) {
            this.statusCode = statusCode;
        }
    };
    sendJSONResponse = (content: any) => {
        if(this.response.writable) {
            content = JSON.stringify(content);
            this.response.setHeader('Content-Type', 'application/json')
            this.response.statusCode = this.statusCode;
            this.response.end(content, 'utf-8');
        }
    };
}
export interface SessionRequest extends IncomingMessage {
    session?: SessionContainerInterface
}

export const middlware = () => {
    return async (req: IncomingMessage, res: ServerResponse, next: (err?: Error) => any) => {
        let supertokens;
        const request = new H3Request(req);
        const response = new H3ResponseTokens(res);
        try {
            supertokens = SuperTokens.getInstanceOrThrowError();
            const result = await supertokens.middleware(request, response);
            if(!result) {
                return next();
            }
        } catch(err: any) {
            if(supertokens) {
                try {
                    await supertokens.errorHandler(err, request, response);
                } catch {
                    next(err);
                }
            } else {
                next(err);
            }
        }

    }
}

export const errorHandler = () => {
    return async (event: H3Event, errorPlain: Error, statusCode: number) => {
        const error = createError(errorPlain);
        error.statusCode = statusCode;
        sendError(event, error)
    }
    
}

export interface H3Framework extends Framework {
    middlware: () => (req: IncomingMessage, res: ServerResponse, next: (err?: Error) => any) => Promise<void>,
    errorHandler: () => (event: H3Event, errorPlain: Error, statusCode: number) => Promise<void>
}

export const H3Wrapper: H3Framework = {
    middlware,
    errorHandler,
    wrapRequest: (unwrapped) => {
        return new H3Request(unwrapped.req);
    },
    wrapResponse: (unwrapped) => {
        return new H3ResponseTokens(unwrapped.res)
    } 
}