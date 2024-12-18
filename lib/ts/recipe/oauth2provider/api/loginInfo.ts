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
import SuperTokensError from "../../../error";

export default async function loginInfoGET(
    apiImplementation: APIInterface,
    options: APIOptions,
    userContext: UserContext
): Promise<boolean> {
    if (apiImplementation.loginInfoGET === undefined) {
        return false;
    }

    const loginChallenge =
        options.req.getKeyValueFromQuery("login_challenge") ?? options.req.getKeyValueFromQuery("loginChallenge");

    if (loginChallenge === undefined) {
        throw new SuperTokensError({
            type: SuperTokensError.BAD_INPUT_ERROR,
            message: "Missing input param: loginChallenge",
        });
    }

    let response = await apiImplementation.loginInfoGET({
        options,
        loginChallenge,
        userContext,
    });

    if ("error" in response) {
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
