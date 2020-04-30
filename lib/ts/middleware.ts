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
import { Response, NextFunction } from "express";
import { getSession } from "./express";
import { SesssionRequest } from "./types";
import { AuthError } from "./error";
import { clearSessionFromCookie } from "./cookieAndHeaders";
import { HandshakeInfo } from "./handshakeInfo";

// TODO: How will the user get access to this?
export function sessionVerify(antiCsrfCheck?: boolean) {
    // TODO: the input request type will be Request only right? The out will have SessionRequest type?
    return async (request: SesssionRequest, response: Response, next: NextFunction) => {
        // TODO: For OPTIONS API, we must only call next() and then return. Is there any other HTTP Method like that?
        let path = request.originalUrl.split("?")[0];
        if (antiCsrfCheck === undefined) {
            antiCsrfCheck = request.method.toLowerCase() !== "get";
        }
        let handShakeInfo = await HandshakeInfo.getInstance();
        // TODO: handShakeInfo.refreshTokenPath may or may not have a trailing /
        // TODO: path may or may not have a trailing /
        // TODO: modify if statement based on the two point above.
        if (handShakeInfo.refreshTokenPath === path) {
            next();
        } else {
            // TODO: Discuss: Any reason to not use async / await?
            getSession(request, response, antiCsrfCheck)
                .then(session => {
                    request.session = session;
                    next();
                })
                .catch(async err => {
                    // TODO: This will changed based on our last discussion.
                    if (AuthError.isErrorFromAuth(err) && err.errType === AuthError.UNAUTHORISED) {
                        clearSessionFromCookie(
                            response,
                            handShakeInfo.cookieDomain,
                            handShakeInfo.cookieSecure,
                            handShakeInfo.accessTokenPath,
                            handShakeInfo.refreshTokenPath,
                            handShakeInfo.idRefreshTokenPath,
                            handShakeInfo.cookieSameSite
                        );
                    }
                    next(err);
                });
        }
    };
}
