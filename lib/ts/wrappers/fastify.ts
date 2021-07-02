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

import type { FastifyInstance, FastifyRequest as OriginalFastifyRequest, FastifyReply } from "fastify";
import { HTTPMethod } from "../types";
import { normaliseHttpMethod, sendNon200Response } from "../utils";
import { BaseRequest } from "./request";
import { BaseResponse } from "./response";
import {
    serializeCookieValue,
    normalizeHeaderValue,
    getCookieValueFromHeaders,
    getCookieValueToSetInHeader,
} from "./utils";
import { Wrapper } from "./types";
import NormalisedURLPath from "../normalisedURLPath";
import RecipeModule from "../recipeModule";
import { HEADER_RID } from "../constants";
import STError from "../error";
import SuperTokens from "../supertokens";
import Session from "../recipe/session/recipe";
import { SessionContainerInterface } from "../recipe/session/types";
import { COOKIE_HEADER } from "./constants";

export class FastifyRequest extends BaseRequest {
    private request: OriginalFastifyRequest;

    constructor(request: OriginalFastifyRequest) {
        super();
        this.request = request;
    }

    getKeyValueFromQuery = async (key: string): Promise<string | undefined> => {
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
        this.response = response;
        this.statusCode = 200;
    }

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
        let prev: string | string[] | undefined = this.response.getHeader(COOKIE_HEADER) as
            | string
            | string[]
            | undefined;
        let cookieValueToSetInHeader = getCookieValueToSetInHeader(prev, serialisedCookie, key);
        this.response.header(COOKIE_HEADER, cookieValueToSetInHeader);
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
        let path = supertokens.appInfo.apiGatewayPath.appendPath(new NormalisedURLPath(request.getOriginalURL()));
        let method: HTTPMethod = normaliseHttpMethod(request.getMethod());

        // if the prefix of the URL doesn't match the base path, we skip
        if (!path.startsWith(supertokens.appInfo.apiBasePath)) {
            return;
        }

        let requestRID = request.getHeaderValue(HEADER_RID);
        if (requestRID !== undefined) {
            let matchedRecipe: RecipeModule | undefined = undefined;

            // we loop through all recipe modules to find the one with the matching rId
            for (let i = 0; i < supertokens.recipeModules.length; i++) {
                if (supertokens.recipeModules[i].getRecipeId() === requestRID) {
                    matchedRecipe = supertokens.recipeModules[i];
                    break;
                }
            }

            if (matchedRecipe === undefined) {
                // we could not find one, so we skip
                return;
            }

            let id = matchedRecipe.returnAPIIdIfCanHandleRequest(path, method);
            if (id === undefined) {
                // the matched recipe doesn't handle this path and http method
                return;
            }

            // give task to the matched recipe
            await supertokens.handleAPI(matchedRecipe, id, request, response, path, method);
        } else {
            // we loop through all recipe modules to find the one with the matching path and method
            for (let i = 0; i < supertokens.recipeModules.length; i++) {
                let id = supertokens.recipeModules[i].returnAPIIdIfCanHandleRequest(path, method);
                if (id !== undefined) {
                    await supertokens.handleAPI(supertokens.recipeModules[i], id, request, response, path, method);
                    break;
                }
            }
        }
    });
    done();
}
(plugin as any)[Symbol.for("skip-override")] = true;

export interface SessionRequest extends OriginalFastifyRequest {
    session?: SessionContainerInterface;
}

const FastifyWrapper: Wrapper = {
    middleware: () => {
        return plugin;
    },
    errorHandler: () => {
        return async (err: any, req: OriginalFastifyRequest, res: FastifyReply) => {
            let supertokens = SuperTokens.getInstanceOrThrowError();
            let request = new FastifyRequest(req);
            let response = new FastifyResponse(res);
            if (STError.isErrorFromSuperTokens(err)) {
                if (err.type === STError.BAD_INPUT_ERROR) {
                    return sendNon200Response(response, err.message, 400);
                }

                // we loop through all the recipes and pass the error to the one that matches the rId
                for (let i = 0; i < supertokens.recipeModules.length; i++) {
                    if (supertokens.recipeModules[i].isErrorFromThisRecipe(err)) {
                        supertokens.recipeModules[i].handleError(err, request, response);
                    }
                }
            }
        };
    },
    verifySession: (options) => {
        return async (req: SessionRequest, res: FastifyReply) => {
            let sessionRecipe = Session.getInstanceOrThrowError();
            let request = new FastifyRequest(req);
            let response = new FastifyResponse(res);
            let session = await sessionRecipe.apiImpl.verifySession({
                verifySessionOptions: options,
                options: {
                    config: sessionRecipe.config,
                    req: request,
                    res: response,
                    recipeId: sessionRecipe.getRecipeId(),
                    isInServerlessEnv: sessionRecipe.isInServerlessEnv,
                    recipeImplementation: sessionRecipe.recipeInterfaceImpl,
                },
            });
            req.session = session;
        };
    },
    wrapRequest: (unwrapped) => {
        return new FastifyRequest(unwrapped);
    },
    wrapReresponse: (unwrapped) => {
        return new FastifyResponse(unwrapped);
    },
};

export default FastifyWrapper;
