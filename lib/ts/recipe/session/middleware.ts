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
import { Response, NextFunction, Request } from "express";
import { SessionRequest, VerifySessionOptions } from "./types";
import SessionRecipe from "./recipe";
import { normaliseHttpMethod, sendNon200Response } from "../../utils";
import NormalisedURLPath from "../../normalisedURLPath";

export function verifySession(recipeInstance: SessionRecipe, options?: VerifySessionOptions) {
    // We know this should be Request but then Type
    return async (request: SessionRequest, response: Response, next: NextFunction) => {
        try {
            let method = normaliseHttpMethod(request.method);
            if (method === "options" || method === "trace") {
                return next();
            }

            let incomingPath = new NormalisedURLPath(
                request.originalUrl === undefined ? request.url : request.originalUrl
            );
            let refreshTokenPath = recipeInstance.config.refreshTokenPath;
            if (incomingPath.equals(refreshTokenPath) && method === "post") {
                request.session = await recipeInstance.recipeInterfaceImpl.refreshSession(request, response);
            } else {
                request.session = await recipeInstance.recipeInterfaceImpl.getSession(request, response, options);
            }
            return next();
        } catch (err) {
            next(err);
        }
    };
}

export async function sendTryRefreshTokenResponse(
    recipeInstance: SessionRecipe,
    _: string,
    __: Request,
    response: Response,
    next: NextFunction
) {
    try {
        sendNon200Response(response, "try refresh token", recipeInstance.config.sessionExpiredStatusCode);
    } catch (err) {
        next(err);
    }
}

export async function sendUnauthorisedResponse(
    recipeInstance: SessionRecipe,
    _: string,
    __: Request,
    response: Response,
    next: NextFunction
) {
    try {
        sendNon200Response(response, "unauthorised", recipeInstance.config.sessionExpiredStatusCode);
    } catch (err) {
        next(err);
    }
}

export async function sendTokenTheftDetectedResponse(
    recipeInstance: SessionRecipe,
    sessionHandle: string,
    _: string,
    __: Request,
    response: Response,
    next: NextFunction
) {
    try {
        await recipeInstance.recipeInterfaceImpl.revokeSession(sessionHandle);
        sendNon200Response(response, "token theft detected", recipeInstance.config.sessionExpiredStatusCode);
    } catch (err) {
        next(err);
    }
}
