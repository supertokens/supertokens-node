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

import { send200Response } from "../../../utils";
import { APIInterface, APIOptions } from "..";
import { UserContext } from "../../../types";
import setCookieParser from "set-cookie-parser";
import Session from "../../session";

export default async function authGET(
    apiImplementation: APIInterface,
    options: APIOptions,
    userContext: UserContext
): Promise<boolean> {
    if (apiImplementation.authGET === undefined) {
        return false;
    }
    const origURL = options.req.getOriginalURL();
    const splitURL = origURL.split("?");
    const params = new URLSearchParams(splitURL[1]);
    let session;
    try {
        session = await Session.getSession(options.req, options.res, { sessionRequired: false }, userContext);
    } catch {
        // TODO: explain
        // ignore
    }

    let response = await apiImplementation.authGET({
        options,
        params: Object.fromEntries(params.entries()),
        cookie: options.req.getHeaderValue("cookie"),
        session,
        userContext,
    });
    if ("redirectTo" in response) {
        // TODO:
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
    } else {
        send200Response(options.res, response);
    }
    return true;
}
