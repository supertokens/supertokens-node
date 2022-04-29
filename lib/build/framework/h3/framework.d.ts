/// <reference types="node" />
import type { IncomingMessage, ServerResponse } from 'http';
import { SessionContainerInterface } from '../../recipe/session/types';
import { BaseRequest } from "../request";
import { BaseResponse } from '../response';
import { Framework } from '../types';
import { Response } from './types';
export declare class H3Request extends BaseRequest {
    private request;
    constructor(request: IncomingMessage);
    getCookieValue: (key: string) => string | undefined;
    getFormData: () => Promise<any>;
    getMethod: () => import("../../types").HTTPMethod;
    getHeaderValue: (key: string) => string | undefined;
    getOriginalURL: () => string;
    getKeyValueFromQuery: (key: string) => string | undefined;
    getJSONBody: () => Promise<any>;
}
export declare class H3ResponseTokens extends BaseResponse {
    private response;
    private statusCode;
    constructor(response: Response);
    sendHTMLResponse: (html: string) => void;
    setHeader: (key: string, value: string, allowDuplicateKey: boolean) => void;
    setCookie: (key: string, value: string, domain: string | undefined, secure: boolean, httpOnly: boolean, expires: number, path: string, sameSite: "strict" | "lax" | "none") => void;
    setStatusCode: (statusCode: number) => void;
    sendJSONResponse: (content: any) => void;
}
export interface SessionRequest extends IncomingMessage {
    session?: SessionContainerInterface;
}
export declare const middlware: () => (req: IncomingMessage, res: ServerResponse, next: (err?: Error | undefined) => any) => Promise<any>;
export declare const errorHandler: () => (err: any, req: IncomingMessage, res: ServerResponse, next: (err?: Error | undefined) => any) => Promise<any>;
export interface H3Framework extends Framework {
    middlware: () => (req: IncomingMessage, res: ServerResponse, next: (err?: Error) => any) => Promise<void>;
    errorHandler: () => (err: any, req: IncomingMessage, res: ServerResponse, next: (err?: Error) => any) => Promise<void>;
}
export declare const H3Wrapper: H3Framework;
