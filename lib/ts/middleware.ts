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
import { getSession, refreshSession, revokeSession } from "./express";
import {
    SesssionRequest,
    ErrorHandlerMiddleware,
    SuperTokensErrorMiddlewareOptions
} from "./types";
import { AuthError } from "./error";
import { clearSessionFromCookie } from "./cookieAndHeaders";
import { HandshakeInfo } from "./handshakeInfo";

// TODO: How will the user get access to this?
export function middleware(antiCsrfCheck?: boolean) {
    // TODO: the input request type will be Request only right? The out will have SessionRequest type?
    // We know this should be Request but then Type
    return async (request: SesssionRequest, response: Response, next: NextFunction) => {
        // TODO: For OPTIONS API, we must only call next() and then return. Is there any other HTTP Method like that?
        if (request.method.toLowerCase() === "options") {
            return next();
        }
        let path = request.originalUrl.split("?")[0];
        if (antiCsrfCheck === undefined) {
            antiCsrfCheck = request.method.toLowerCase() !== "get";
        }
        let handShakeInfo = await HandshakeInfo.getInstance();
        // TODO: handShakeInfo.refreshTokenPath may or may not have a trailing /
        // TODO: path may or may not have a trailing /
        // TODO: modify if statement based on the two point above.
        // TODO: Discuss: Any reason to not use async / await?
        try {
            if (
                handShakeInfo.refreshTokenPath === path
                ||
                `${handShakeInfo.refreshTokenPath}/` === path
                ||
                handShakeInfo.refreshTokenPath === `${path}/`
            ) {
                request.session = await refreshSession(request, response);
                return next();
            }
            request.session = await getSession(request, response, antiCsrfCheck);
            return next();
        } catch (err) {
            return next(err);
        }
        // TODO: This will changed based on our last discussion.
    };
}


export function errorHandler(options: SuperTokensErrorMiddlewareOptions): ErrorHandlerMiddleware {
    return (err: any, request: Request, response: Response, next: NextFunction) => {
        if (AuthError.isErrorFromAuth(err)) {
            if (err.errType === AuthError.UNAUTHORISED) {
                if (options.onUnauthorised !== undefined) {
                    options.onUnauthorised(err.err, request, response, next);
                } else {
                    sendUnauthorisedResponse(err.err, request, response, next);
                }
            } else if (err.errType === AuthError.TRY_REFRESH_TOKEN) {
                if (options.onTryRefreshToken !== undefined) {
                    options.onTryRefreshToken(err.err, request, response, next);
                } else {
                    sendTryRefreshTokenResponse(err.err, request, response, next);
                }
            } else if (err.errType === AuthError.TOKEN_THEFT_DETECTED) {
                if (options.onTokenTheftDetected !== undefined) {
                    options.onTokenTheftDetected(err.err.sessionHandle, err.err.userId, request, response, next);
                } else {
                    sendTokenTheftDetectedResponse(err.err.sessionHandle, err.err.userId, request, response, next);
                }
            } else {
                next(err.err);
            }
        } else {
            next(err);
        }
    };
}

async function sendTryRefreshTokenResponse(err: any, request: Request, response: Response, next: NextFunction) {
    try {
        let handshakeInfo = await HandshakeInfo.getInstance();
        sendResponse(response, "try refresh token", handshakeInfo.sessionExpiredStatusCode);
    } catch (err) {
        next(err);
    }
}

async function sendUnauthorisedResponse(err: any, request: Request, response: Response, next: NextFunction) {
    try {
        let handshakeInfo = await HandshakeInfo.getInstance();
        sendResponse(response, "unauthorised", handshakeInfo.sessionExpiredStatusCode);
    } catch (err) {
        next(err);
    }
}

async function sendTokenTheftDetectedResponse(sessionHandle: string, userId: string, request: Request, response: Response, next: NextFunction) {
    try {
        let handshakeInfo = await HandshakeInfo.getInstance();
        await revokeSession(sessionHandle);
        sendResponse(response, "token theft detected", handshakeInfo.sessionExpiredStatusCode);
    } catch (err) {
        next(err);
    }
}

function sendResponse(response: Response, message: string, statusCode: number) {
    if (!response.finished) {
        response.statusCode = statusCode;
        response.json({
            message
        });
    }
}