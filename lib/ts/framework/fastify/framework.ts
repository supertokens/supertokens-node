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

import type {
    FastifyInstance,
    FastifyRequest as OriginalFastifyRequest,
    FastifyReply,
    FastifyPluginCallback,
} from "fastify";
import type { HTTPMethod } from "../../types";
import { normaliseHttpMethod } from "../../utils";
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

    getFormData = async (): Promise<any> => {
        return this.request.body; // NOTE: ask user to add require('fastify-formbody')
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

    getJSONBody = async (): Promise<any> => {
        return this.request.body;
    };

    getMethod = (): HTTPMethod => {
        return normaliseHttpMethod(this.request.method);
    };

    getCookieValue = (key: string): string | undefined => {
        return getCookieValueFromHeaders(this.request.headers, key);
    };

    getHeaderValue = (key: string): string | undefined => {
        return normalizeHeaderValue(this.request.headers[key]);
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
                this.response.header(key, existingValue + ", " + value);
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
        /**
         * lets say if current value is undefined, prev -> undefined
         *
         * now if add AT,
         * cookieValueToSetInHeader -> AT
         * response header object will be:
         *
         * 'set-cookie': AT
         *
         * now if add RT,
         *
         * prev -> AT
         * cookieValueToSetInHeader -> AT + RT
         * and response header object will be:
         *
         * 'set-cookie': AT + AT + RT
         *
         * now if add IRT,
         *
         * prev -> AT + AT + RT
         * cookieValueToSetInHeader -> IRT + AT + AT + RT
         * and response header object will be:
         *
         * 'set-cookie': AT + AT + RT + IRT + AT + AT + RT
         *
         * To avoid this, we no longer get and use the previous value
         *
         * Old code:
         *
         * let prev: string | string[] | undefined = this.response.getHeader(COOKIE_HEADER) as
         * | string
         * | string[]
         * | undefined;
         * let cookieValueToSetInHeader = getCookieValueToSetInHeader(prev, serialisedCookie, key);
         * this.response.header(COOKIE_HEADER, cookieValueToSetInHeader);
         */
        this.response.header(COOKIE_HEADER, serialisedCookie);
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

function plugin(fastify: FastifyInstance, _: any, done: Function) {
    fastify.addHook("preHandler", async (req: OriginalFastifyRequest, reply: FastifyReply) => {
        let supertokens = SuperTokens.getInstanceOrThrowError();
        let request = new FastifyRequest(req);
        let response = new FastifyResponse(reply);
        try {
            await supertokens.middleware(request, response);
        } catch (err) {
            await supertokens.errorHandler(err, request, response);
        }
    });
    done();
}
(plugin as any)[Symbol.for("skip-override")] = true;

export interface SessionRequest extends OriginalFastifyRequest {
    session?: SessionContainerInterface;
}

export interface FasitfyFramework extends Framework {
    plugin: FastifyPluginCallback;
    errorHandler: () => (err: any, req: OriginalFastifyRequest, res: FastifyReply) => Promise<void>;
}

export const errorHandler = () => {
    return async (err: any, req: OriginalFastifyRequest, res: FastifyReply) => {
        let supertokens = SuperTokens.getInstanceOrThrowError();
        let request = new FastifyRequest(req);
        let response = new FastifyResponse(res);
        await supertokens.errorHandler(err, request, response);
    };
};

export const FastifyWrapper: FasitfyFramework = {
    plugin,
    errorHandler,
    wrapRequest: (unwrapped) => {
        return new FastifyRequest(unwrapped);
    },
    wrapResponse: (unwrapped) => {
        return new FastifyResponse(unwrapped);
    },
};
