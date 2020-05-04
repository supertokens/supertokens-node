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
import { SesssionRequest, ErrorHandlerMiddleware, SuperTokensErrorMiddlewareOptions } from "./types";
import { AuthError } from "./error";
import { clearSessionFromCookie } from "./cookieAndHeaders";
import { HandshakeInfo } from "./handshakeInfo";

export function middleware(antiCsrfCheck?: boolean) {
    // We know this should be Request but then Type
    return async (request: SesssionRequest, response: Response, next: NextFunction) => {
        try {
            if (request.method.toLowerCase() === "options" || request.method.toLowerCase() === "trace") {
                return next();
            }
            let path = request.originalUrl.split("?")[0];
            let handShakeInfo = await HandshakeInfo.getInstance();
            if (
                (handShakeInfo.refreshTokenPath === path ||
                    `${handShakeInfo.refreshTokenPath}/` === path ||
                    handShakeInfo.refreshTokenPath === `${path}/`) &&
                request.method.toLowerCase() === "post"
            ) {
                request.session = await refreshSession(request, response);
            } else {
                if (antiCsrfCheck === undefined) {
                    antiCsrfCheck = request.method.toLowerCase() !== "get";
                }
                request.session = await getSession(request, response, antiCsrfCheck);
            }
            return next();
        } catch (err) {
            next(err);
        }
    };
}

export function errorHandler(options?: SuperTokensErrorMiddlewareOptions): ErrorHandlerMiddleware {
    return (err: any, request: Request, response: Response, next: NextFunction) => {
        if (AuthError.isErrorFromAuth(err)) {
            if (err.errType === AuthError.UNAUTHORISED) {
                if (options !== undefined && options.onUnauthorised !== undefined) {
                    options.onUnauthorised(err.err, request, response, next);
                } else {
                    sendUnauthorisedResponse(err.err, request, response, next);
                }
            } else if (err.errType === AuthError.TRY_REFRESH_TOKEN) {
                if (options !== undefined && options.onTryRefreshToken !== undefined) {
                    options.onTryRefreshToken(err.err, request, response, next);
                } else {
                    sendTryRefreshTokenResponse(err.err, request, response, next);
                }
            } else if (err.errType === AuthError.TOKEN_THEFT_DETECTED) {
                if (options !== undefined && options.onTokenTheftDetected !== undefined) {
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

async function sendTokenTheftDetectedResponse(
    sessionHandle: string,
    userId: string,
    request: Request,
    response: Response,
    next: NextFunction
) {
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
            message,
        });
    }
}
