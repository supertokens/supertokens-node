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
import { ErrorHandlerMiddleware, SuperTokensErrorMiddlewareOptions, SessionRequest } from "./types";
import { refreshSession, getSession } from "./express";
import { CookieConfig } from "../cookieAndHeaders";
import { HandshakeInfo } from "../handshakeInfo";
import * as OriginalMiddleware from "../middleware";

/* TODO: is there a way to not have to duplicate all the code here from ../middleware?
 * Simply calling that will not work since we want to call getSession and refreshSession of
 * faunaDB.
 */

// We do not use the middleware functions from ../middleware, because we want the
// refreshSession, getSession of the ones defined for faunadb to be called.
export function autoRefreshMiddleware() {
    return async (request: Request, response: Response, next: NextFunction) => {
        try {
            let path = request.originalUrl.split("?")[0];
            let refreshTokenPath = await getRefreshPath();
            if (
                (refreshTokenPath === path || `${refreshTokenPath}/` === path || refreshTokenPath === `${path}/`) &&
                request.method.toLowerCase() === "post"
            ) {
                await refreshSession(request, response);
                return response.send(JSON.stringify({}));
            }
            return next();
        } catch (err) {
            next(err);
        }
    };
}

async function getRefreshPath(): Promise<string> {
    let refreshTokenPathConfig = CookieConfig.getInstance().refreshTokenPath;
    if (refreshTokenPathConfig !== undefined) {
        return refreshTokenPathConfig;
    }
    let handShakeInfo = await HandshakeInfo.getInstance();
    return handShakeInfo.refreshTokenPath;
}

export function middleware(antiCsrfCheck?: boolean) {
    // We know this should be Request but then Type
    return async (request: SessionRequest, response: Response, next: NextFunction) => {
        try {
            if (request.method.toLowerCase() === "options" || request.method.toLowerCase() === "trace") {
                return next();
            }
            let path = request.originalUrl.split("?")[0];
            let refreshTokenPath = await getRefreshPath();
            if (
                (refreshTokenPath === path || `${refreshTokenPath}/` === path || refreshTokenPath === `${path}/`) &&
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
    return OriginalMiddleware.errorHandler(options);
}
