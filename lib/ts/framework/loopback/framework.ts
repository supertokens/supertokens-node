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
} from "../utils";
import SuperTokens from "../../supertokens";
import type { Framework } from "../types";

export class LoopbackRequest extends BaseRequest {
    private request: Request;
    private parserChecked: boolean;

    constructor(ctx: MiddlewareContext) {
        super();
        this.request = ctx.request;
        this.parserChecked = false;
    }

    getKeyValueFromQuery = async (key: string): Promise<string | undefined> => {
        if (!this.parserChecked) {
            await assertThatBodyParserHasBeenUsedForExpressLikeRequest(this.getMethod(), this.request);
            this.parserChecked = true;
        }
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
        this.response = ctx.response;
        this.statusCode = 200;
    }

    setHeader = (key: string, value: string, allowDuplicateKey: boolean) => {
        setHeaderForExpressLikeResponse(this.response, key, value, allowDuplicateKey);
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
        this.statusCode = statusCode;
    };
    sendJSONResponse = (content: any) => {
        if (!this.response.writableEnded) {
            this.response.status(this.statusCode).json(content);
        }
    };
}

export interface SessionRequest extends Request {
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
        return supertokens.errorHandler(err, request, response);
    }
};

export const LoopbackWrapper: LoopbackFramework = {
    middleware,
    wrapRequest: (unwrapped) => {
        if (unwrapped.request === undefined) {
            unwrapped = {
                request: unwrapped,
            };
        }
        return new LoopbackRequest(unwrapped);
    },
    wrapResponse: (unwrapped) => {
        if (unwrapped.response === undefined) {
            unwrapped = {
                response: unwrapped,
            };
        }
        return new LoopbackResponse(unwrapped);
    },
};
