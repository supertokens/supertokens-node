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
import { send200Response } from "../../../utils";
import { APIInterface, APIOptions } from "..";
import Session from "../../session";
import { UserContext } from "../../../types";
import SuperTokensError from "../../../error";

export default async function login(
    apiImplementation: APIInterface,
    options: APIOptions,
    userContext: UserContext
): Promise<boolean> {
    if (apiImplementation.loginGET === undefined) {
        return false;
    }

    let session;
    try {
        session = await Session.getSession(options.req, options.res, { sessionRequired: false }, userContext);
    } catch {
        // We can handle this as if the session is not present, because then we redirect to the frontend,
        // which should handle the validation error
        session = undefined;
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
        userContext,
    });
    if ("status" in response) {
        send200Response(options.res, response);
    } else {
        if (response.setCookie) {
            const cookieStr = setCookieParser.splitCookiesString(response.setCookie);
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
        options.res.original.redirect(response.redirectTo);
    }
    return true;
}
