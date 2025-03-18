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
import Session from "../../session";
import { UserContext } from "../../../types";
import SuperTokensError from "../../../error";

export async function logoutPOST(
    apiImplementation: APIInterface,
    options: APIOptions,
    userContext: UserContext
): Promise<boolean> {
    if (apiImplementation.logoutPOST === undefined) {
        return false;
    }

    let session;
    try {
        session = await Session.getSession(options.req, options.res, { sessionRequired: false }, userContext);
    } catch {
        session = undefined;
    }

    const body = await options.req.getBodyAsJSONOrFormData();

    if (body.logoutChallenge === undefined) {
        throw new SuperTokensError({
            type: SuperTokensError.BAD_INPUT_ERROR,
            message: "Missing body param: logoutChallenge",
        });
    }

    let response = await apiImplementation.logoutPOST({
        options,
        logoutChallenge: body.logoutChallenge,
        session,
        userContext,
    });

    if ("status" in response && response.status === "OK") {
        send200Response(options.res, response);
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
