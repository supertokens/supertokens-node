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

import { Request, Response, NextFunction } from "express";
import { HTTPMethod } from "../types";
import { normaliseHttpMethod, sendNon200Response } from "../utils";
import { BaseRequest } from "./request";
import { BaseResponse } from "./response";
import {
    setCookieForServerResponse,
    setHeaderForExpressLikeResponse,
    getCookieValueFromIncomingMessage,
    getHeaderValueFromIncomingMessage,
    assertThatBodyParserHasBeenUsedForExpressLikeRequest,
} from "./utils";
import { Wrapper } from "./types";
import NormalisedURLPath from "../normalisedURLPath";
import RecipeModule from "../recipeModule";
import { HEADER_RID } from "../constants";
import STError from "../error";
import SuperTokens from "../supertokens";
import Session from "../recipe/session/recipe";
import { SessionContainerInterface } from "../recipe/session/types";

export class ExpressRequest extends BaseRequest {
    private request: Request;
    private parserChecked: boolean;

    constructor(request: Request) {
        super();
        this.request = request;
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

export class ExpressResponse extends BaseResponse {
    private response: Response;
    private statusCode: number;

    constructor(response: Response) {
        super();
        this.response = response;
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

    /**
     * @param {number} statusCode
     */
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

const ExpressWrapper: Wrapper = {
    middleware: () => {
        return async (req: Request, res: Response, next: NextFunction) => {
            try {
                let supertokens = SuperTokens.getInstanceOrThrowError();
                let request = new ExpressRequest(req);
                let response = new ExpressResponse(res);
                let path = supertokens.appInfo.apiGatewayPath.appendPath(
                    new NormalisedURLPath(request.getOriginalURL())
                );
                let method: HTTPMethod = normaliseHttpMethod(request.getMethod());

                // if the prefix of the URL doesn't match the base path, we skip
                if (!path.startsWith(supertokens.appInfo.apiBasePath)) {
                    return next();
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
                        return next();
                    }

                    let id = matchedRecipe.returnAPIIdIfCanHandleRequest(path, method);
                    if (id === undefined) {
                        // the matched recipe doesn't handle this path and http method
                        return next();
                    }

                    // give task to the matched recipe
                    let requestHandled = await supertokens.handleAPI(
                        matchedRecipe,
                        id,
                        request,
                        response,
                        path,
                        method
                    );
                    if (!requestHandled) {
                        return next();
                    }
                    return;
                } else {
                    // we loop through all recipe modules to find the one with the matching path and method
                    for (let i = 0; i < supertokens.recipeModules.length; i++) {
                        let id = supertokens.recipeModules[i].returnAPIIdIfCanHandleRequest(path, method);
                        if (id !== undefined) {
                            let requestHandled = await supertokens.handleAPI(
                                supertokens.recipeModules[i],
                                id,
                                request,
                                response,
                                path,
                                method
                            );
                            if (!requestHandled) {
                                return next();
                            }
                            return;
                        }
                    }
                    return next();
                }
            } catch (err) {
                next(err);
            }
        };
    },
    errorHandler: () => {
        return async (err: any, req: Request, res: Response, next: NextFunction) => {
            let supertokens = SuperTokens.getInstanceOrThrowError();
            let request = new ExpressRequest(req);
            let response = new ExpressResponse(res);
            if (STError.isErrorFromSuperTokens(err)) {
                if (err.type === STError.BAD_INPUT_ERROR) {
                    return sendNon200Response(response, err.message, 400);
                }

                // we loop through all the recipes and pass the error to the one that matches the rId
                for (let i = 0; i < supertokens.recipeModules.length; i++) {
                    if (supertokens.recipeModules[i].isErrorFromThisRecipe(err)) {
                        try {
                            return supertokens.recipeModules[i].handleError(err, request, response);
                        } catch (error) {
                            return next(error);
                        }
                    }
                }
            }

            return next(err);
        };
    },
    verifySession: (options) => {
        return async (req: SessionRequest, res: Response, next: NextFunction) => {
            let session = Session.getInstanceOrThrowError();
            let request = new ExpressRequest(req);
            let response = new ExpressResponse(res);
            await session.apiImpl.verifySession({
                verifySessionOptions: options,
                options: {
                    config: session.config,
                    req: request,
                    res: response,
                    recipeId: session.getRecipeId(),
                    isInServerlessEnv: session.isInServerlessEnv,
                    recipeImplementation: session.recipeInterfaceImpl,
                },
            });
            next();
        };
    },
};

export default ExpressWrapper;
