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

import type { Request, Response, NextFunction } from "express";
import type { HTTPMethod } from "../../types";
import { makeDefaultUserContextFromAPI, normaliseHttpMethod } from "../../utils";
import { BaseRequest } from "../request";
import { BaseResponse } from "../response";
import {
    setCookieForServerResponse,
    setHeaderForExpressLikeResponse,
    getCookieValueFromIncomingMessage,
    getHeaderValueFromIncomingMessage,
    assertThatBodyParserHasBeenUsedForExpressLikeRequest,
    assertFormDataBodyParserHasBeenUsedForExpressLikeRequest,
} from "../utils";
import type { Framework } from "../types";
import SuperTokens from "../../supertokens";
import type { SessionContainerInterface } from "../../recipe/session/types";
import { Buffer } from "node:buffer";

export class ExpressRequest extends BaseRequest {
    private request: Request;

    constructor(request: Request) {
        super();
        this.original = request;
        this.request = request;
    }

    protected getFormDataFromRequestBody = async (): Promise<any> => {
        await assertFormDataBodyParserHasBeenUsedForExpressLikeRequest(this.request);
        return this.request.body;
    };

    protected getJSONFromRequestBody = async (): Promise<any> => {
        await assertThatBodyParserHasBeenUsedForExpressLikeRequest(this.getMethod(), this.request);
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
        return this.request.originalUrl || this.request.url;
    };
}

export class ExpressResponse extends BaseResponse {
    private response: Response;
    private statusCode: number;

    constructor(response: Response) {
        super();
        this.original = response;
        this.response = response;
        this.statusCode = 200;
    }

    sendHTMLResponse = (html: string) => {
        if (!this.response.writableEnded) {
            /**
             * response.set method is not available if response
             * is a nextjs response object. setHeader method
             * is present on OutgoingMessage which is one of the
             * bases used to construct response object for express
             * like response as well as nextjs like response
             */
            this.response.setHeader("Content-Type", "text/html");
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

    /**
     * @param {number} statusCode
     */
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

export interface SessionRequest extends Request {
    session?: SessionContainerInterface;
}

export const middleware = () => {
    return async (req: Request, res: Response, next: NextFunction) => {
        let supertokens;
        const request = new ExpressRequest(req);
        const response = new ExpressResponse(res);
        const userContext = makeDefaultUserContextFromAPI(request);

        try {
            supertokens = SuperTokens.getInstanceOrThrowError();
            const result = await supertokens.middleware(request, response, userContext);
            if (!result) {
                return next();
            }
        } catch (err) {
            if (supertokens) {
                try {
                    await supertokens.errorHandler(err, request, response, userContext);
                } catch {
                    next(err);
                }
            } else {
                next(err);
            }
        }
    };
};
export const errorHandler = () => {
    return async (err: any, req: Request, res: Response, next: NextFunction) => {
        let supertokens = SuperTokens.getInstanceOrThrowError();
        let request = new ExpressRequest(req);
        let response = new ExpressResponse(res);
        const userContext = makeDefaultUserContextFromAPI(request);
        try {
            await supertokens.errorHandler(err, request, response, userContext);
        } catch (err) {
            return next(err);
        }
    };
};

export interface ExpressFramework extends Framework {
    middleware: () => (req: Request, res: Response, next: NextFunction) => Promise<void>;
    errorHandler: () => (err: any, req: Request, res: Response, next: NextFunction) => Promise<void>;
}

export const ExpressWrapper: ExpressFramework = {
    middleware,
    errorHandler,
    wrapRequest: (unwrapped) => {
        return new ExpressRequest(unwrapped);
    },
    wrapResponse: (unwrapped) => {
        return new ExpressResponse(unwrapped);
    },
};
