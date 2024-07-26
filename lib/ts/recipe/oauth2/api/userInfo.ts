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

import { send200Response, sendNon200ResponseWithMessage } from "../../../utils";
import { APIInterface, APIOptions } from "..";
import { JSONObject, UserContext } from "../../../types";
import { getUser } from "../../..";

// TODO: Replace stub implementation by the actual implementation
async function validateOAuth2AccessToken(accessToken: string) {
    const resp = await fetch(`http://localhost:4445/admin/oauth2/introspect`, {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ token: accessToken }),
    });
    return await resp.json();
}

export default async function userInfoGET(
    apiImplementation: APIInterface,
    tenantId: string,
    options: APIOptions,
    userContext: UserContext
): Promise<boolean> {
    if (apiImplementation.userInfoGET === undefined) {
        return false;
    }

    const authHeader = options.req.getHeaderValue("authorization") || options.req.getHeaderValue("Authorization");

    if (authHeader === undefined || !authHeader.startsWith("Bearer ")) {
        // TODO: Returning a 400 instead of a 401 to prevent a potential refresh loop in the client SDK.
        // When addressing this TODO, review other response codes in this function as well.
        sendNon200ResponseWithMessage(options.res, "Missing or invalid Authorization header", 400);
        return true;
    }

    const accessToken = authHeader.replace(/^Bearer /, "").trim();

    let accessTokenPayload: JSONObject;

    try {
        accessTokenPayload = await validateOAuth2AccessToken(accessToken);
    } catch (error) {
        options.res.setHeader("WWW-Authenticate", 'Bearer error="invalid_token"', false);
        sendNon200ResponseWithMessage(options.res, "Invalid or expired OAuth2 access token", 400);
        return true;
    }

    if (
        accessTokenPayload === null ||
        typeof accessTokenPayload !== "object" ||
        typeof accessTokenPayload.sub !== "string" ||
        typeof accessTokenPayload.scope !== "string"
    ) {
        options.res.setHeader("WWW-Authenticate", 'Bearer error="invalid_token"', false);
        sendNon200ResponseWithMessage(options.res, "Malformed access token payload", 400);
        return true;
    }

    const userId = accessTokenPayload.sub;

    const user = await getUser(userId, userContext);

    if (user === undefined) {
        options.res.setHeader("WWW-Authenticate", 'Bearer error="invalid_token"', false);
        sendNon200ResponseWithMessage(options.res, "Couldn't find any user associated with the access token", 400);
        return true;
    }

    const response = await apiImplementation.userInfoGET({
        accessTokenPayload,
        user,
        tenantId,
        scopes: accessTokenPayload.scope.split(" "),
        options,
        userContext,
    });

    send200Response(options.res, response);
    return true;
}
