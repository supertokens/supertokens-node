/* Copyright (c) 2024, VRAI Labs and/or its affiliates. All rights reserved.
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

import setCookieParser from "set-cookie-parser";
import { send200Response, sendNon200Response } from "../../../utils";
import { APIInterface, APIOptions } from "..";
import Session from "../../session";
import { UserContext } from "../../../types";
import SuperTokensError from "../../../error";
import SessionError from "../../../recipe/session/error";

export default async function login(
    apiImplementation: APIInterface,
    options: APIOptions,
    userContext: UserContext
): Promise<boolean> {
    if (apiImplementation.loginGET === undefined) {
        return false;
    }

    let session, shouldTryRefresh;
    try {
        session = await Session.getSession(options.req, options.res, { sessionRequired: false }, userContext);
        shouldTryRefresh = false;
    } catch (error) {
        // We can handle this as if the session is not present, because then we redirect to the frontend,
        // which should handle the validation error
        session = undefined;
        if (SuperTokensError.isErrorFromSuperTokens(error) && error.type === SessionError.TRY_REFRESH_TOKEN) {
            shouldTryRefresh = true;
        } else {
            shouldTryRefresh = false;
        }
    }

    const loginChallenge =
        options.req.getKeyValueFromQuery("login_challenge") ?? options.req.getKeyValueFromQuery("loginChallenge");
    if (loginChallenge === undefined) {
        throw new SuperTokensError({
            type: SuperTokensError.BAD_INPUT_ERROR,
            message: "Missing input param: loginChallenge",
        });
    }
    let response = await apiImplementation.loginGET({
        options,
        loginChallenge,
        session,
        shouldTryRefresh,
        userContext,
    });

    if ("frontendRedirectTo" in response) {
        if (response.cookies) {
            const cookieStr = setCookieParser.splitCookiesString(response.cookies);
            const cookies = setCookieParser.parse(cookieStr);
            for (const cookie of cookies) {
                options.res.setCookie(
                    cookie.name,
                    cookie.value,
                    cookie.domain,
                    !!cookie.secure,
                    !!cookie.httpOnly,
                    new Date(cookie.expires!).getTime(),
                    cookie.path || "/",
                    cookie.sameSite as any
                );
            }
        }
        send200Response(options.res, {
            frontendRedirectTo: response.frontendRedirectTo,
        });
    } else if ("statusCode" in response) {
        // We want to avoid returning a 401 to the frontend, as it may trigger a refresh loop
        if (response.statusCode === 401) {
            response.statusCode = 400;
        }

        sendNon200Response(options.res, response.statusCode ?? 400, {
            error: response.error,
            error_description: response.errorDescription,
        });
    } else {
        send200Response(options.res, response);
    }
    return true;
}
