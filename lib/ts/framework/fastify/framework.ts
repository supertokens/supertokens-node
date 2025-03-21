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

import {
    FastifyRequest as OriginalFastifyRequest,
    FastifyReply,
    FastifyInstance,
    FastifyPluginCallback,
} from "./types";
import type { HTTPMethod } from "../../types";
import { getFromObjectCaseInsensitive, makeDefaultUserContextFromAPI, normaliseHttpMethod } from "../../utils";
import { BaseRequest } from "../request";
import { BaseResponse } from "../response";
import { serializeCookieValue, normalizeHeaderValue, getCookieValueFromHeaders } from "../utils";
import type { Framework } from "../types";
import SuperTokens from "../../supertokens";
import type { SessionContainerInterface } from "../../recipe/session/types";
import { COOKIE_HEADER } from "../constants";

export class FastifyRequest extends BaseRequest {
    private request: OriginalFastifyRequest;

    constructor(request: OriginalFastifyRequest) {
        super();
        this.original = request;
        this.request = request;
    }

    protected getFormDataFromRequestBody = async (): Promise<any> => {
        return this.request.body; // NOTE: ask user to add require('fastify-formbody')
    };

    protected getJSONFromRequestBody = async (): Promise<any> => {
        return this.request.body;
    };

    getKeyValueFromQuery = (key: string): string | undefined => {
        if (this.request.query === undefined) {
            return undefined;
        }
        let value = (this.request.query as any)[key];
        if (value === undefined || typeof value !== "string") {
            return undefined;
        }
        return value;
    };

    getMethod = (): HTTPMethod => {
        return normaliseHttpMethod(this.request.method);
    };

    getCookieValue = (key: string): string | undefined => {
        return getCookieValueFromHeaders(this.request.headers, key);
    };

    getHeaderValue = (key: string): string | undefined => {
        return normalizeHeaderValue(getFromObjectCaseInsensitive(key, this.request.headers));
    };

    getOriginalURL = (): string => {
        return this.request.url;
    };
}

export class FastifyResponse extends BaseResponse {
    private response: FastifyReply;
    private statusCode: number;

    constructor(response: FastifyReply) {
        super();
        this.original = response;
        this.response = response;
        this.statusCode = 200;
    }

    sendHTMLResponse = (html: string) => {
        if (!this.response.sent) {
            this.response.type("text/html");
            this.response.send(html);
        }
    };
    setHeader = (key: string, value: string, allowDuplicateKey: boolean) => {
        try {
            let existingHeaders = this.response.getHeaders();
            let existingValue = existingHeaders[key.toLowerCase()];

            // we have the this.response.header for compatibility with nextJS
            if (existingValue === undefined) {
                this.response.header(key, value);
            } else if (allowDuplicateKey) {
                /**
                    We only want to append if it does not already exist
                    For example if the caller is trying to add front token to the access control exposed headers property
                    we do not want to append if something else had already added it
                */
                if (typeof existingValue !== "string" || !existingValue.includes(value)) {
                    this.response.header(key, existingValue + ", " + value);
                }
            } else {
                // we overwrite the current one with the new one
                this.response.header(key, value);
            }
        } catch (err) {
            throw new Error("Error while setting header with key: " + key + " and value: " + value);
        }
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
        let serialisedCookie = serializeCookieValue(key, value, domain, secure, httpOnly, expires, path, sameSite);

        let oldHeaders: string | string[] | undefined | number = this.response.getHeader(COOKIE_HEADER);
        if (oldHeaders === undefined) oldHeaders = [];
        else if (!((oldHeaders as any) instanceof Array)) oldHeaders = [oldHeaders.toString()];

        this.response.removeHeader(COOKIE_HEADER);
        this.response.header(COOKIE_HEADER, [
            ...(oldHeaders as string[]).filter((h) => !h.startsWith(key + "=")),
            serialisedCookie,
        ]);
    };

    /**
     * @param {number} statusCode
     */
    setStatusCode = (statusCode: number) => {
        if (!this.response.sent) {
            this.statusCode = statusCode;
        }
    };

    /**
     * @param {any} content
     */
    sendJSONResponse = (content: any) => {
        if (!this.response.sent) {
            this.response.statusCode = this.statusCode;
            this.response.send(content);
        }
    };
}

function plugin(fastify: FastifyInstance, _: unknown, done: () => void) {
    fastify.addHook("preHandler", async (req: OriginalFastifyRequest, reply: FastifyReply) => {
        let supertokens = SuperTokens.getInstanceOrThrowError();
        let request = new FastifyRequest(req);
        let response = new FastifyResponse(reply);
        const userContext = makeDefaultUserContextFromAPI(request);

        try {
            await supertokens.middleware(request, response, userContext);
        } catch (err) {
            await supertokens.errorHandler(err, request, response, userContext);
        }
    });
    done();
}
(plugin as any)[Symbol.for("skip-override")] = true;

export type SessionRequest<TRequest extends OriginalFastifyRequest = OriginalFastifyRequest> = TRequest & {
    session?: SessionContainerInterface;
};

export interface FastifyFramework extends Framework {
    plugin: FastifyPluginCallback;
    errorHandler: () => (err: any, req: OriginalFastifyRequest, res: FastifyReply) => Promise<void>;
}

export const errorHandler = () => {
    return async (err: any, req: OriginalFastifyRequest, res: FastifyReply) => {
        let supertokens = SuperTokens.getInstanceOrThrowError();
        let request = new FastifyRequest(req);
        let response = new FastifyResponse(res);
        let userContext = makeDefaultUserContextFromAPI(request);
        await supertokens.errorHandler(err, request, response, userContext);
    };
};

export const FastifyWrapper: FastifyFramework = {
    plugin,
    errorHandler,
    wrapRequest: (unwrapped) => {
        return new FastifyRequest(unwrapped);
    },
    wrapResponse: (unwrapped) => {
        return new FastifyResponse(unwrapped);
    },
};
