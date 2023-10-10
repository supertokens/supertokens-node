/* Copyright (c) 2021, VRAI Labs and/or its affiliates. All rights reserved.
 *
 * This software is licensed under the Apache License, Version 2.0 (the
 * "License") as published by the Apache Software Foundation.
 *
 * You may not use this file except in compliance with the License. You may
 * obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations
 * under the License.
 */

import type { HTTPMethod } from "../../types";
import { makeDefaultUserContextFromAPI, normaliseHttpMethod } from "../../utils";
import { BaseRequest } from "../request";
import { BaseResponse } from "../response";
import SuperTokens from "../../supertokens";
import { SessionContainerInterface } from "../../recipe/session/types";

type RequestInfo = {
    url: string;
    method: HTTPMethod;
    headers: Headers;
    cookies: Record<string, string>;
    query: Record<string, string>;
    getJSONBody: () => Promise<any>;
    getFormBody: () => Promise<any>;
    setSession?: (session: SessionContainerInterface) => void;
};

export class PreParsedRequest extends BaseRequest {
    private request: RequestInfo;

    private _session?: SessionContainerInterface | undefined;
    public get session(): SessionContainerInterface | undefined {
        return this._session;
    }
    public set session(value: SessionContainerInterface | undefined) {
        this._session = value;
        if (value !== undefined && this.request.setSession !== undefined) {
            this.request.setSession(value);
        }
    }

    constructor(request: RequestInfo) {
        super();
        this.original = request;
        this.request = request;
    }

    getFormData = async (): Promise<any> => {
        return this.request.getFormBody();
    };

    getKeyValueFromQuery = (key: string): string | undefined => {
        if (this.request.query === undefined) {
            return undefined;
        }
        let value = this.request.query[key];
        if (value === undefined || typeof value !== "string") {
            return undefined;
        }
        return value;
    };

    getJSONBody = async (): Promise<any> => {
        return this.request.getJSONBody();
    };

    getMethod = (): HTTPMethod => {
        return normaliseHttpMethod(this.request.method);
    };

    getCookieValue = (key: string): string | undefined => {
        return this.request.cookies[key];
    };

    getHeaderValue = (key: string): string | undefined => {
        return this.request.headers.get(key) ?? undefined;
    };

    getOriginalURL = (): string => {
        return this.request.url;
    };
}

export type CookieInfo = {
    key: string;
    value: string;
    domain: string | undefined;
    secure: boolean;
    httpOnly: boolean;
    expires: number;
    path: string;
    sameSite: "strict" | "lax" | "none";
};

export class CollectingResponse extends BaseResponse {
    public statusCode: number;
    public readonly headers: Headers;
    public readonly cookies: CookieInfo[];
    public body?: string;

    constructor() {
        super();
        this.headers = new Headers();
        this.statusCode = 200;
        this.cookies = [];
    }

    sendHTMLResponse = (html: string) => {
        this.headers.set("Content-Type", "text/html");
        this.body = html;
    };

    setHeader = (key: string, value: string, allowDuplicateKey: boolean) => {
        if (allowDuplicateKey) {
            this.headers.append(key, value);
        } else {
            this.headers.set(key, value);
        }
    };

    removeHeader = (key: string) => {
        this.headers.delete(key);
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
        this.cookies.push({ key, value, domain, secure, httpOnly, expires, path, sameSite });
    };

    /**
     * @param {number} statusCode
     */
    setStatusCode = (statusCode: number) => {
        this.statusCode = statusCode;
    };

    sendJSONResponse = (content: any) => {
        this.headers.set("Content-Type", "application/json");
        this.body = JSON.stringify(content);
    };
}

export type NextFunction = (err?: any) => void;

const identity = (i: any) => i;
export const middleware = <OrigReqType = BaseRequest, OrigRespType = BaseResponse>(
    wrapRequest: (req: OrigReqType) => BaseRequest = identity,
    wrapResponse: (req: OrigRespType) => BaseResponse = identity
) => {
    return async (request: OrigReqType, response: OrigRespType, next?: NextFunction) => {
        const wrappedReq = wrapRequest(request);
        const wrappedResp = wrapResponse(response);
        let supertokens;
        const userContext = makeDefaultUserContextFromAPI(wrappedReq);

        try {
            supertokens = SuperTokens.getInstanceOrThrowError();
            const result = await supertokens.middleware(wrappedReq, wrappedResp, userContext);
            if (!result) {
                if (next) {
                    next();
                }
                return { handled: false };
            }
            return { handled: true };
        } catch (err) {
            if (supertokens) {
                try {
                    await supertokens.errorHandler(err, wrappedReq, wrappedResp, userContext);
                    return { handled: true };
                } catch {
                    if (next) {
                        next(err);
                    }
                    return { error: err };
                }
            } else {
                if (next) {
                    next(err);
                }
                return { error: err };
            }
        }
    };
};

export const errorHandler = () => {
    return async (err: any, request: BaseRequest, response: BaseResponse, next: NextFunction) => {
        let supertokens = SuperTokens.getInstanceOrThrowError();
        const userContext = makeDefaultUserContextFromAPI(request);

        try {
            await supertokens.errorHandler(err, request, response, userContext);
        } catch (err) {
            return next(err);
        }
    };
};

export const CustomFrameworkWrapper = {
    middleware,
    errorHandler,
};
