import type {IncomingMessage, ServerResponse} from 'http';
import { SessionContainerInterface } from '../../recipe/session/types';
import SuperTokens from '../../supertokens';
import { normaliseHttpMethod } from "../../utils";
import { BaseRequest } from "../request";
import { BaseResponse } from '../response';
import { Framework } from '../types';
import {
    getHeaderValueFromIncomingMessage, useBody, useRawBody, setCookieForServerResponse
} from "../utils";
import {Response, Request} from './types';
const defer = typeof setImmediate !== 'undefined' ? setImmediate : (fn: Function) => fn()

export class H3Request extends BaseRequest {
    private request: IncomingMessage;
    constructor(request: IncomingMessage) {
        super();
        this.original = request;
        this.request = request;
    };
    getCookieValue = (key: string) => {
        return getHeaderValueFromIncomingMessage(this.request, key);
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
    private response: Response;
    private statusCode: number;
    constructor(response: Response) {
        super();
        this.original = response;
        this.response = response;
        this.statusCode = 200
    }

    sendHTMLResponse = (html: string) => {
        if(this.response.res.writable) {
            this.response.res.setHeader('Content-Type', 'text/html')
            this.response.res.statusCode = this.statusCode;
            new Promise((resolve) => {
                defer(() => {
                    this.response.res.end(html);
                    resolve(undefined);
                })
            })
        }
    };
    setHeader = (key: string, value: string, allowDuplicateKey: boolean) => {
        try { 
            console.log(this.response.res.setHeader);
            const allheaders = this.response.res.getHeaders();
            let existingValue = allheaders[key];

            // we have the this.response.header for compatibility with nextJS
            if (existingValue === undefined) {
                this.response.res.setHeader(key, value);
            } else if (allowDuplicateKey) {
                this.response.res.setHeader(key, existingValue + ", " + value);
            } else {
                // we overwrite the current one with the new one
                this.response.res.setHeader(key, value);
            }
        } catch (err) {
            console.log(err);
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
        setCookieForServerResponse(this.response.res, key, value, domain, secure, httpOnly, expires, path, sameSite);
    };
    setStatusCode = (statusCode: number) => {
        if(this.response.res.writable) {
            this.statusCode = statusCode
        }
    };
    sendJSONResponse = (content: any) => {
        if(this.response.res.writable) {
            this.response.res.setHeader('Content-Type', 'application/json')
            this.response.res.statusCode = this.statusCode;
            new Promise((resolve) => {
                defer(() => {
                    this.response.res.end(content);
                    resolve(undefined);
                })
            })
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
        const response = new H3ResponseTokens({res: res});
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
    return async (err: any, req: IncomingMessage, res: ServerResponse, next: (err?: Error) => any) => {
        let supertokens = SuperTokens.getInstanceOrThrowError();
        let request = new H3Request(req);
        let response = new H3ResponseTokens({res: res});
        try {
            await supertokens.errorHandler(err, request,response);
        } catch(err: any) {
            return next(err);
        }
    }
};

export interface H3Framework extends Framework {
    middlware: () => (req: IncomingMessage, res: ServerResponse, next: (err?: Error) => any) => Promise<void>,
    errorHandler: () => (err: any, req: IncomingMessage, res: ServerResponse, next: (err?: Error) => any) => Promise<void>
}

export const H3Wrapper: H3Framework = {
    middlware,
    errorHandler,
    wrapRequest: (unwrapped) => {
        return new H3Request(unwrapped);
    },
    wrapResponse: (unwrapped) => {
        return new H3ResponseTokens(unwrapped)
    } 
}