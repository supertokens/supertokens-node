/* Copyright (c) 2020, VRAI Labs and/or its affiliates. All rights reserved.
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
import { SessionRequest, ErrorHandlerMiddleware, TypeInput } from "./types";
import SessionRecipe from "./sessionRecipe";
import { normaliseHttpMethod, normaliseURLPathOrThrowError } from "../../utils";

export function verifySession(recipeInstance: SessionRecipe, antiCsrfCheck?: boolean) {
    // We know this should be Request but then Type
    return async (request: SessionRequest, response: Response, next: NextFunction) => {
        try {
            let method = normaliseHttpMethod(request.method);
            if (method === "options" || method === "trace") {
                return next();
            }
            let incomingPath = normaliseURLPathOrThrowError(recipeInstance.getRecipeId(), request.originalUrl);
            let refreshTokenPath = recipeInstance.config.refreshTokenPath;
            if (incomingPath === refreshTokenPath && method === "post") {
                request.session = await recipeInstance.refreshSession(request, response);
            } else {
                if (antiCsrfCheck === undefined) {
                    antiCsrfCheck = method !== "get";
                }
                request.session = await recipeInstance.getSession(request, response, antiCsrfCheck);
            }
            return next();
        } catch (err) {
            next(err);
        }
    };
}

export async function sendTryRefreshTokenResponse(
    recipeInstance: SessionRecipe,
    message: string,
    request: Request,
    response: Response,
    next: NextFunction
) {
    try {
        sendResponse(response, "try refresh token", recipeInstance.config.sessionExpiredStatusCode);
    } catch (err) {
        next(err);
    }
}

export async function sendUnauthorisedResponse(
    recipeInstance: SessionRecipe,
    message: string,
    request: Request,
    response: Response,
    next: NextFunction
) {
    try {
        sendResponse(response, "unauthorised", recipeInstance.config.sessionExpiredStatusCode);
    } catch (err) {
        next(err);
    }
}

export async function sendTokenTheftDetectedResponse(
    recipeInstance: SessionRecipe,
    sessionHandle: string,
    userId: string,
    request: Request,
    response: Response,
    next: NextFunction
) {
    try {
        await recipeInstance.revokeSession(sessionHandle);
        sendResponse(response, "token theft detected", recipeInstance.config.sessionExpiredStatusCode);
    } catch (err) {
        next(err);
    }
}

function sendResponse(response: Response, message: string, statusCode: number) {
    if (!response.writableEnded) {
        response.statusCode = statusCode;
        response.json({
            message,
        });
    }
}
