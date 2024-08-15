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

import { send200Response, sendNon200Response } from "../../../utils";
import { APIInterface, APIOptions } from "..";
import { UserContext } from "../../../types";
import Session from "../../session";

export async function endSessionGET(
    apiImplementation: APIInterface,
    options: APIOptions,
    userContext: UserContext
): Promise<boolean> {
    if (apiImplementation.endSessionGET === undefined) {
        return false;
    }
    const origURL = options.req.getOriginalURL();
    const splitURL = origURL.split("?");
    const params = new URLSearchParams(splitURL[1]);

    return endSessionCommon(
        Object.fromEntries(params.entries()),
        apiImplementation.endSessionGET,
        options,
        userContext
    );
}

export async function endSessionPOST(
    apiImplementation: APIInterface,
    options: APIOptions,
    userContext: UserContext
): Promise<boolean> {
    if (apiImplementation.endSessionPOST === undefined) {
        return false;
    }
    const params = await options.req.getBodyAsJSONOrFormData();

    return endSessionCommon(params, apiImplementation.endSessionPOST, options, userContext);
}

async function endSessionCommon(
    params: Record<string, string>,
    apiImplementation: APIInterface["endSessionGET"] | APIInterface["endSessionPOST"],
    options: APIOptions,
    userContext: UserContext
): Promise<boolean> {
    if (apiImplementation === undefined) {
        return false;
    }

    // TODO: Validate client_id if passed

    let session;
    try {
        session = await Session.getSession(options.req, options.res, { sessionRequired: false }, userContext);
    } catch {
        session = undefined;
    }

    let response = await apiImplementation({
        options,
        params,
        session,
        userContext,
    });

    if ("redirectTo" in response) {
        // TODO: Fix
        if (response.redirectTo.includes("/oauth/fallbacks/error")) {
            const redirectToUrlObj = new URL(response.redirectTo);
            const res = {
                error: redirectToUrlObj.searchParams.get("error"),
                errorDescription: redirectToUrlObj.searchParams.get("error_description"),
            };
            sendNon200Response(options.res, 400, res);
        } else {
            options.res.original.redirect(response.redirectTo);
        }
    } else {
        send200Response(options.res, response);
    }
    return true;
}
