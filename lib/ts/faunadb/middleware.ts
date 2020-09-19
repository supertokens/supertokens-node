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
import { ErrorHandlerMiddleware, SuperTokensErrorMiddlewareOptions, SessionRequest } from "../types";
import * as OriginalMiddleware from "../middleware";
import { Session } from "./express";

export function autoRefreshMiddleware() {
    return async (request: SessionRequest, response: Response, next: NextFunction) => {
        let originalFunction = OriginalMiddleware.autoRefreshMiddleware();
        originalFunction(request, response, (err) => {
            if (err !== undefined) {
                return next(err);
            }
            if (request.session === undefined) {
                return next();
            }
            request.session = new Session(
                request.session.getAccessToken(),
                request.session.getHandle(),
                request.session.getUserId(),
                request.session.getJWTPayload(),
                response
            );
            return next();
        });
    };
}

export function middleware(antiCsrfCheck?: boolean) {
    return async (request: SessionRequest, response: Response, next: NextFunction) => {
        let originalFunction = OriginalMiddleware.middleware(antiCsrfCheck);
        originalFunction(request, response, (err) => {
            if (err !== undefined) {
                return next(err);
            }
            if (request.session === undefined) {
                return next();
            }
            request.session = new Session(
                request.session.getAccessToken(),
                request.session.getHandle(),
                request.session.getUserId(),
                request.session.getJWTPayload(),
                response
            );
            return next();
        });
    };
}

export function errorHandler(options?: SuperTokensErrorMiddlewareOptions): ErrorHandlerMiddleware {
    return OriginalMiddleware.errorHandler(options);
}
