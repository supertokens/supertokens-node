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

import type { Request, ResponseToolkit, Plugin, ResponseObject, ServerRoute } from "@hapi/hapi";
import type { Boom } from "@hapi/boom";
import type { HTTPMethod } from "../../types";
import { normaliseHttpMethod } from "../../utils";
import { BaseRequest } from "../request";
import { BaseResponse } from "../response";
import { normalizeHeaderValue, getCookieValueFromHeaders } from "../utils";
import type { Framework } from "../types";
import SuperTokens from "../../supertokens";
import type { SessionContainerInterface } from "../../recipe/session/types";

export class HapiRequest extends BaseRequest {
    private request: Request;

    constructor(request: Request) {
        super();
        this.original = request;
        this.request = request;
    }

    getFormData = async (): Promise<any> => {
        return this.request.payload === undefined || this.request.payload === null ? {} : this.request.payload;
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
        return this.request.payload === undefined || this.request.payload === null ? {} : this.request.payload;
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
        return this.request.url.toString();
    };
}

export interface ExtendedResponseToolkit extends ResponseToolkit {
    lazyHeaderBindings: (h: ResponseToolkit, key: string, value: string, allowDuplicateKey: boolean) => void;
}

export class HapiResponse extends BaseResponse {
    private response: ExtendedResponseToolkit;
    private statusCode: number;
    private content: any;
    public responseSet: boolean;

    constructor(response: ExtendedResponseToolkit) {
        super();
        this.original = response;
        this.response = response;
        this.statusCode = 200;
        this.content = null;
        this.responseSet = false;
    }

    sendHTMLResponse = (html: string) => {
        if (!this.responseSet) {
            this.content = html;
            this.setHeader("Content-Type", "text/html", false);
            this.responseSet = true;
        }
    };

    setHeader = (key: string, value: string, allowDuplicateKey: boolean) => {
        try {
            this.response.lazyHeaderBindings(this.response, key, value, allowDuplicateKey);
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
        let now = Date.now();
        if (expires > now) {
            this.response.state(key, value, {
                isHttpOnly: httpOnly,
                isSecure: secure,
                path: path,
                domain,
                ttl: expires - now,
                isSameSite: sameSite === "lax" ? "Lax" : sameSite === "none" ? "None" : "Strict",
            });
        } else {
            this.response.unstate(key);
        }
    };

    /**
     * @param {number} statusCode
     */
    setStatusCode = (statusCode: number) => {
        this.statusCode = statusCode;
    };

    /**
     * @param {any} content
     */
    sendJSONResponse = (content: any) => {
        if (!this.responseSet) {
            this.content = content;
            this.responseSet = true;
        }
    };

    sendResponse = (overwriteHeaders = false): ResponseObject => {
        if (!overwriteHeaders) {
            return this.response.response(this.content).code(this.statusCode).takeover();
        }
        return this.response.response(this.content).code(this.statusCode);
    };
}

const plugin: Plugin<{}> = {
    name: "supertokens-hapi-middleware",
    version: "1.0.0",
    register: async function (server, _) {
        let supertokens = SuperTokens.getInstanceOrThrowError();
        server.ext("onPreHandler", async (req, h) => {
            let request = new HapiRequest(req);
            let response = new HapiResponse(h as ExtendedResponseToolkit);
            let result = await supertokens.middleware(request, response);
            if (!result) {
                return h.continue;
            }
            return response.sendResponse();
        });
        server.ext("onPreResponse", async (request, h) => {
            (((request.app as any).lazyHeaders || []) as {
                key: string;
                value: string;
                allowDuplicateKey: boolean;
            }[]).forEach(({ key, value, allowDuplicateKey }) => {
                if ((request.response as Boom).isBoom) {
                    (request.response as Boom).output.headers[key] = value;
                } else {
                    (request.response as ResponseObject).header(key, value, { append: allowDuplicateKey });
                }
            });
            if ((request.response as Boom).isBoom) {
                let err = (request.response as Boom).data;
                let req = new HapiRequest(request);
                let res = new HapiResponse(h as ExtendedResponseToolkit);
                if (err !== undefined && err !== null) {
                    try {
                        await supertokens.errorHandler(err, req, res);
                        if (res.responseSet) {
                            let resObj = res.sendResponse(true);
                            (((request.app as any).lazyHeaders || []) as {
                                key: string;
                                value: string;
                                allowDuplicateKey: boolean;
                            }[]).forEach(({ key, value, allowDuplicateKey }) => {
                                resObj.header(key, value, { append: allowDuplicateKey });
                            });
                            return resObj.takeover();
                        }
                        return h.continue;
                    } catch (e) {
                        return h.continue;
                    }
                }
            }
            return h.continue;
        });
        server.decorate("toolkit", "lazyHeaderBindings", function (
            h: ResponseToolkit,
            key: string,
            value: string,
            allowDuplicateKey: boolean
        ) {
            (h.request.app as any).lazyHeaders = (h.request.app as any).lazyHeaders || [];
            (h.request.app as any).lazyHeaders.push({ key, value, allowDuplicateKey });
        });
        let supportedRoutes: ServerRoute[] = [];
        for (let i = 0; i < supertokens.recipeModules.length; i++) {
            let apisHandled = supertokens.recipeModules[i].getAPIsHandled();
            for (let j = 0; j < apisHandled.length; j++) {
                let api = apisHandled[j];
                if (!api.disabled) {
                    let path = `${supertokens.appInfo.apiBasePath.getAsStringDangerous()}${api.pathWithoutApiBasePath.getAsStringDangerous()}`;
                    supportedRoutes.push({
                        path,
                        method: api.method,
                        handler: (_, h) => {
                            return h.continue;
                        },
                    });
                }
            }
        }
        server.route(supportedRoutes);
    },
};

export interface SessionRequest extends Request {
    session?: SessionContainerInterface;
}

export interface HapiFramework extends Framework {
    plugin: Plugin<{}>;
}

export const HapiWrapper: HapiFramework = {
    plugin,
    wrapRequest: (unwrapped) => {
        return new HapiRequest(unwrapped);
    },
    wrapResponse: (unwrapped) => {
        return new HapiResponse(unwrapped);
    },
};
