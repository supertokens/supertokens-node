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

import type { Context, Next } from "koa";
import type { HTTPMethod } from "../../types";
import { normaliseHttpMethod } from "../../utils";
import { BaseRequest } from "../request";
import { BaseResponse } from "../response";
import { getHeaderValueFromIncomingMessage } from "../utils";
import { json, form } from "co-body";
import { SessionContainerInterface } from "../../recipe/session/types";
import SuperTokens from "../../supertokens";
import { Framework } from "../types";

export class KoaRequest extends BaseRequest {
    private ctx: Context;
    private parsedJSONBody: Object | undefined;
    private parsedUrlEncodedFormData: Object | undefined;

    constructor(ctx: Context) {
        super();
        this.original = ctx;
        this.ctx = ctx;
        this.parsedJSONBody = undefined;
        this.parsedUrlEncodedFormData = undefined;
    }

    getFormData = async (): Promise<any> => {
        if (this.parsedUrlEncodedFormData === undefined) {
            this.parsedUrlEncodedFormData = await parseURLEncodedFormData(this.ctx);
        }
        return this.parsedUrlEncodedFormData;
    };

    getKeyValueFromQuery = (key: string): string | undefined => {
        if (this.ctx.query === undefined) {
            return undefined;
        }
        let value = this.ctx.request.query[key];
        if (value === undefined || typeof value !== "string") {
            return undefined;
        }
        return value;
    };

    getJSONBody = async (): Promise<any> => {
        if (this.parsedJSONBody === undefined) {
            this.parsedJSONBody = await parseJSONBodyFromRequest(this.ctx);
        }
        return this.parsedJSONBody === undefined ? {} : this.parsedJSONBody;
    };

    getMethod = (): HTTPMethod => {
        return normaliseHttpMethod(this.ctx.request.method);
    };

    getCookieValue = (key: string): string | undefined => {
        return this.ctx.cookies.get(key);
    };

    getHeaderValue = (key: string): string | undefined => {
        return getHeaderValueFromIncomingMessage(this.ctx.req, key);
    };

    getOriginalURL = (): string => {
        return this.ctx.originalUrl;
    };
}

async function parseJSONBodyFromRequest(ctx: Context) {
    if (ctx.body !== undefined) {
        return ctx.body;
    }
    return await json(ctx);
}

async function parseURLEncodedFormData(ctx: Context) {
    if (ctx.body !== undefined) {
        return ctx.body;
    }
    return await form(ctx);
}

export class KoaResponse extends BaseResponse {
    private ctx: Context;
    public responseSet: boolean = false;

    constructor(ctx: Context) {
        super();
        this.original = ctx;
        this.ctx = ctx;
    }

    sendHTMLResponse = (html: string) => {
        this.ctx.set("content-type", "text/html");
        this.ctx.body = html;
    };

    setHeader = (key: string, value: string, allowDuplicateKey: boolean) => {
        try {
            let existingHeaders = this.ctx.response.headers;
            let existingValue = existingHeaders[key.toLowerCase()];

            if (existingValue === undefined) {
                this.ctx.set(key, value);
            } else if (allowDuplicateKey) {
                this.ctx.set(key, existingValue + ", " + value);
            } else {
                // we overwrite the current one with the new one
                this.ctx.set(key, value);
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
        this.ctx.cookies.set(key, value, {
            secure,
            sameSite,
            httpOnly,
            expires: new Date(expires),
            domain,
            path,
        });
    };

    /**
     * @param {number} statusCode
     */
    setStatusCode = (statusCode: number) => {
        this.ctx.status = statusCode;
    };

    sendJSONResponse = (content: any) => {
        if (!this.responseSet) {
            this.ctx.body = content;
            this.responseSet = true;
        }
    };
}

export interface SessionContext extends Context {
    session?: SessionContainerInterface;
}

export const middleware = () => {
    return async (ctx: Context, next: Next) => {
        let supertokens = SuperTokens.getInstanceOrThrowError();
        let request = new KoaRequest(ctx);
        let response = new KoaResponse(ctx);
        try {
            let result = await supertokens.middleware(request, response);
            if (!result) {
                return await next();
            }
        } catch (err) {
            return await supertokens.errorHandler(err, request, response);
        }
    };
};

export interface KoaFramework extends Framework {
    middleware: () => (ctx: Context, next: Next) => Promise<void>;
}

export const KoaWrapper: KoaFramework = {
    middleware,
    wrapRequest: (unwrapped) => {
        return new KoaRequest(unwrapped);
    },
    wrapResponse: (unwrapped) => {
        return new KoaResponse(unwrapped);
    },
};
