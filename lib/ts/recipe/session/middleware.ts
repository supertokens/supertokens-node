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
import { SessionRequest, ErrorHandlerMiddleware, SuperTokensErrorMiddlewareOptions, TypeInput } from "./types";
import STError from "./error";
import SessionRecipe from "./sessionRecipe";

// export function autoRefreshMiddleware() {
//     return async (request: Request, response: Response, next: NextFunction) => {
//         try {
//             let path = request.originalUrl.split("?")[0];
//             let refreshTokenPath = await getRefreshPath();
//             if (
//                 (refreshTokenPath === path || `${refreshTokenPath}/` === path || refreshTokenPath === `${path}/`) &&
//                 request.method.toLowerCase() === "post"
//             ) {
//                 await refreshSession(request, response);
//                 return response.send(JSON.stringify({}));
//             }
//             return next();
//         } catch (err) {
//             next(err);
//         }
//     };
// }

export function middleware(recipeInstance: SessionRecipe, antiCsrfCheck?: boolean) {
    // We know this should be Request but then Type
    return async (request: SessionRequest, response: Response, next: NextFunction) => {
        try {
            if (request.method.toLowerCase() === "options" || request.method.toLowerCase() === "trace") {
                return next();
            }
            let path = request.originalUrl.split("?")[0];
            let refreshTokenPath = recipeInstance.config.refreshTokenPath;
            if (
                (refreshTokenPath === path || `${refreshTokenPath}/` === path || refreshTokenPath === `${path}/`) &&
                request.method.toLowerCase() === "post"
            ) {
                request.session = await recipeInstance.refreshSession(request, response);
            } else {
                if (antiCsrfCheck === undefined) {
                    antiCsrfCheck = request.method.toLowerCase() !== "get";
                }
                request.session = await recipeInstance.getSession(request, response, antiCsrfCheck);
            }
            return next();
        } catch (err) {
            next(err);
        }
    };
}

export function errorHandler(
    recipeInstance: SessionRecipe,
    options?: SuperTokensErrorMiddlewareOptions
): ErrorHandlerMiddleware {
    return (err: any, request: Request, response: Response, next: NextFunction) => {
        if (recipeInstance.isErrorFromThisRecipe(err)) {
            if (err.type === STError.UNAUTHORISED) {
                if (options !== undefined && options.onUnauthorised !== undefined) {
                    options.onUnauthorised(err.message, request, response, next);
                } else {
                    sendUnauthorisedResponse(recipeInstance, err.message, request, response, next);
                }
            } else if (err.type === STError.TRY_REFRESH_TOKEN) {
                if (options !== undefined && options.onTryRefreshToken !== undefined) {
                    options.onTryRefreshToken(err.message, request, response, next);
                } else {
                    sendTryRefreshTokenResponse(recipeInstance, err.message, request, response, next);
                }
            } else if (err.type === STError.TOKEN_THEFT_DETECTED) {
                if (options !== undefined && options.onTokenTheftDetected !== undefined) {
                    options.onTokenTheftDetected(
                        err.payload.sessionHandle,
                        err.payload.userId,
                        request,
                        response,
                        next
                    );
                } else {
                    sendTokenTheftDetectedResponse(
                        recipeInstance,
                        err.payload.sessionHandle,
                        err.payload.userId,
                        request,
                        response,
                        next
                    );
                }
            } else {
                next(err.payload);
            }
        } else {
            next(err);
        }
    };
}

async function sendTryRefreshTokenResponse(
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

async function sendUnauthorisedResponse(
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

async function sendTokenTheftDetectedResponse(
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
    if (!response.finished) {
        response.statusCode = statusCode;
        response.json({
            message,
        });
    }
}
