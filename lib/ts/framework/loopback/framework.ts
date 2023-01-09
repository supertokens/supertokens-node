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

import type { MiddlewareContext, Request, Response, Middleware } from "@loopback/rest";
import type { Next } from "@loopback/core";
import { SessionContainerInterface } from "../../recipe/session/types";
import { HTTPMethod } from "../../types";
import { normaliseHttpMethod } from "../../utils";
import { BaseRequest } from "../request";
import { BaseResponse } from "../response";
import {
    getCookieValueFromIncomingMessage,
    getHeaderValueFromIncomingMessage,
    assertThatBodyParserHasBeenUsedForExpressLikeRequest,
    setHeaderForExpressLikeResponse,
    setCookieForServerResponse,
    assertFormDataBodyParserHasBeenUsedForExpressLikeRequest,
} from "../utils";
import SuperTokens from "../../supertokens";
import type { Framework } from "../types";
import { COOKIE_HEADER } from "../constants";

export class LoopbackRequest extends BaseRequest {
    private request: Request;
    private parserChecked: boolean;
    private formDataParserChecked: boolean;

    constructor(ctx: MiddlewareContext) {
        super();
        this.original = ctx.request;
        this.request = ctx.request;
        this.parserChecked = false;
        this.formDataParserChecked = false;
    }

    getFormData = async (): Promise<any> => {
        if (!this.formDataParserChecked) {
            await assertFormDataBodyParserHasBeenUsedForExpressLikeRequest(this.request);
            this.formDataParserChecked = true;
        }
        return this.request.body;
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
        if (!this.parserChecked) {
            await assertThatBodyParserHasBeenUsedForExpressLikeRequest(this.getMethod(), this.request);
            this.parserChecked = true;
        }
        return this.request.body;
    };

    getMethod = (): HTTPMethod => {
        return normaliseHttpMethod(this.request.method);
    };

    getCookieValue = (key: string): string | undefined => {
        return getCookieValueFromIncomingMessage(this.request, key);
    };

    getHeaderValue = (key: string): string | undefined => {
        return getHeaderValueFromIncomingMessage(this.request, key);
    };

    getOriginalURL = (): string => {
        return this.request.originalUrl;
    };
}

export class LoopbackResponse extends BaseResponse {
    response: Response;
    private statusCode: number;

    constructor(ctx: MiddlewareContext) {
        super();
        this.original = ctx.response;
        this.response = ctx.response;
        this.statusCode = 200;
    }

    sendHTMLResponse = (html: string) => {
        if (!this.response.writableEnded) {
            this.response.set("Content-Type", "text/html");
            this.response.status(this.statusCode).send(Buffer.from(html));
        }
    };

    setHeader = (key: string, value: string, allowDuplicateKey: boolean) => {
        setHeaderForExpressLikeResponse(this.response, key, value, allowDuplicateKey);
    };

    removeHeader = (key: string) => {
        this.response.removeHeader(key);
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

    clearCookie = (key: string) => {
        let setCookies: string | string[] = this.response.get(COOKIE_HEADER);
        if (setCookies === undefined || setCookies === "") {
            return;
        }
        this.response.removeHeader(COOKIE_HEADER);
        const prefix = key + "=";
        // Typescript is weird about instanceof
        if (!((setCookies as any) instanceof Array)) {
            setCookies = [setCookies];
        }
        for (const cookie of setCookies) {
            if (!cookie.startsWith(prefix)) {
                this.response.header(COOKIE_HEADER, cookie);
            }
        }
    };

    setStatusCode = (statusCode: number) => {
        if (!this.response.writableEnded) {
            this.statusCode = statusCode;
        }
    };
    sendJSONResponse = (content: any) => {
        if (!this.response.writableEnded) {
            this.response.status(this.statusCode).json(content);
        }
    };
}

export interface SessionContext extends MiddlewareContext {
    session?: SessionContainerInterface;
}

export interface LoopbackFramework extends Framework {
    middleware: Middleware;
}
export const middleware: Middleware = async (ctx: MiddlewareContext, next: Next) => {
    let supertokens = SuperTokens.getInstanceOrThrowError();
    let request = new LoopbackRequest(ctx);
    let response = new LoopbackResponse(ctx);
    try {
        let result = await supertokens.middleware(request, response);
        if (!result) {
            return await next();
        }
        return;
    } catch (err) {
        return await supertokens.errorHandler(err, request, response);
    }
};

export const LoopbackWrapper: LoopbackFramework = {
    middleware,
    wrapRequest: (unwrapped) => {
        return new LoopbackRequest(unwrapped);
    },
    wrapResponse: (unwrapped) => {
        return new LoopbackResponse(unwrapped);
    },
};
