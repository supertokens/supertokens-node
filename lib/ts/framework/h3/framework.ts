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
    eventHandler,
    send,
    setCookie,
    createError,
    EventHandler,
    H3Event,
    sendError,
    readBody,
    getQuery,
    getCookie,
    getHeader,
    getMethod,

} from "h3";
import type { HTTPMethod } from "../../types";
import { normaliseHttpMethod } from "../../utils";
import { BaseRequest } from "../request";
import { BaseResponse } from "../response";
import type { Framework } from "../types";
import SuperTokens from "../../supertokens";
import type { SessionContainerInterface } from "../../recipe/session/types";

export class H3Request extends BaseRequest {
    private event: H3Event;

    constructor(event: H3Event) {
        super();
        this.original = event;
        this.event = event;
    }

    getFormData = async (): Promise<any> => {
        return readBody(this.event);
    };

    getKeyValueFromQuery = (key: string): string | undefined => {
        const query = getQuery(this.event);
        if (query === undefined) {
            return undefined;
        }
        let value = query[key];
        if (value === undefined || typeof value !== "string") {
            return undefined;
        }
        return value;
    };

    getJSONBody = async (): Promise<any> => {
        return readBody(this.event);
    };

    getMethod = (): HTTPMethod => {
        return normaliseHttpMethod(getMethod(this.event));
    };

    getCookieValue = (key: string): string | undefined => {
        return getCookie(this.event, key);
    };

    getHeaderValue = (key: string): string | undefined => {
        return getHeader(this.event, key);
    };

    getOriginalURL = (): string => {
        let path = this.event.path;
        if (!path) {
            throw new Error("Error while trying to get original url");
        }
        return path;
    };
}

export class H3Response extends BaseResponse {
    private event: H3Event;
    private statusCode: number;

    constructor(event: H3Event) {
        super();
        this.original = event;
        this.event = event;
        this.statusCode = 200;
    }

    sendHTMLResponse = (html: string) => {
        if (this.event.node.res.writable) {
            /**
             * response.set method is not available if response
             * is a nextjs response object. setHeader method
             * is present on OutgoingMessage which is one of the
             * bases used to construct response object for express
             * like response as well as nextjs like response
             */
            this.event.node.res.setHeader("Content-Type", "text/html");
            this.event.node.res.statusCode = this.statusCode;
            send(this.event, html);
            // this.response.status(this.statusCode).send(Buffer.from(html));
        }
    };

    setHeader = (key: string, value: string, allowDuplicateKey: boolean) => {
        try {
            let existingHeaders = this.event.node.res.getHeaders();
            let existingValue = existingHeaders[key.toLowerCase()];

            // we have the this.response.header for compatibility with nextJS
            if (existingValue === undefined) {
                this.event.node.res.setHeader(key, value);
            } else if (allowDuplicateKey) {
                this.event.node.res.setHeader(key, existingValue + ", " + value);
            } else {
                // we overwrite the current one with the new one
                this.event.node.res.setHeader(key, value);
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
        setCookie(this.event, key, value, {
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
        if (this.event.node.res.writable) {
            this.statusCode = statusCode;
        }
    };

    sendJSONResponse = (content: any) => {
        if (this.event.node.res.writable) {
            this.event.node.res.setHeader("Content-Type", "application/json");
            this.event.node.res.statusCode = this.statusCode;
            send(this.event, content);
        }
    };
}

export interface SessionEvent extends H3Event {
    context: {
        session?: SessionContainerInterface;
    }
}

export const middleware = eventHandler(async (event) => {
    const supertokens = SuperTokens.getInstanceOrThrowError();
    const request = new H3Request(event);
    const response = new H3Response(event);
    try {
        await supertokens.middleware(request, response);
    } catch (err) {
        await supertokens.errorHandler(err, request, response);
    }
});

export const errorHandler = eventHandler((event: H3Event) => {
    const error = createError({});
    sendError(event, error);
});

export interface H3Framework extends Framework {
    middleware: EventHandler<any>;
    errorHandler: EventHandler<any>;
}

export const H3Wrapper: H3Framework = {
    middleware,
    errorHandler,
    wrapRequest: (unwrapped) => {
        return new H3Request(unwrapped);
    },
    wrapResponse: (unwrapped) => {
        return new H3Response(unwrapped);
    },
};
