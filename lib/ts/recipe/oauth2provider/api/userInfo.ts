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

import OAuth2ProviderRecipe from "../recipe";
import { send200Response, sendNon200ResponseWithMessage } from "../../../utils";
import { APIInterface, APIOptions } from "..";
import { JSONObject, UserContext } from "../../../types";
import { getUser } from "../../..";

export default async function userInfoGET(
    apiImplementation: APIInterface,
    tenantId: string,
    options: APIOptions,
    userContext: UserContext
): Promise<boolean> {
    if (apiImplementation.userInfoGET === undefined) {
        return false;
    }

    const authHeader = options.req.getHeaderValue("authorization");

    if (authHeader === undefined || !authHeader.startsWith("Bearer ")) {
        sendNon200ResponseWithMessage(options.res, "Missing or invalid Authorization header", 401);
        return true;
    }

    const accessToken = authHeader.replace(/^Bearer /, "").trim();

    let accessTokenPayload: JSONObject;

    try {
        const validateTokenResponse =
            await OAuth2ProviderRecipe.getInstanceOrThrowError().recipeInterfaceImpl.validateOAuth2AccessToken({
                token: accessToken,
                userContext,
            });

        if (validateTokenResponse.status === "OAUTH_ERROR") {
            sendNon200ResponseWithMessage(
                options.res,
                validateTokenResponse.errorDescription,
                validateTokenResponse.statusCode
            );
            return true;
        }

        accessTokenPayload = validateTokenResponse.payload;
    } catch (error) {
        options.res.setHeader("WWW-Authenticate", 'Bearer error="invalid_token"', false);
        options.res.setHeader("Access-Control-Expose-Headers", "WWW-Authenticate", true);
        sendNon200ResponseWithMessage(options.res, "Invalid or expired OAuth2 access token", 401);
        return true;
    }

    if (
        accessTokenPayload === null ||
        typeof accessTokenPayload !== "object" ||
        typeof accessTokenPayload.sub !== "string" ||
        !Array.isArray(accessTokenPayload.scp)
    ) {
        options.res.setHeader("WWW-Authenticate", 'Bearer error="invalid_token"', false);
        options.res.setHeader("Access-Control-Expose-Headers", "WWW-Authenticate", true);
        sendNon200ResponseWithMessage(options.res, "Malformed access token payload", 401);
        return true;
    }

    const userId = accessTokenPayload.sub;

    const user = await getUser(userId, userContext);

    if (user === undefined) {
        options.res.setHeader("WWW-Authenticate", 'Bearer error="invalid_token"', false);
        options.res.setHeader("Access-Control-Expose-Headers", "WWW-Authenticate", true);
        sendNon200ResponseWithMessage(options.res, "Couldn't find any user associated with the access token", 401);
        return true;
    }

    const response = await apiImplementation.userInfoGET({
        accessTokenPayload,
        user,
        tenantId,
        scopes: accessTokenPayload.scp as string[],
        options,
        userContext,
    });

    send200Response(options.res, response);
    return true;
}
