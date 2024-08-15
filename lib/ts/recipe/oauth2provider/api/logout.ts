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
import Session from "../../session";
import { UserContext } from "../../../types";
import SuperTokensError from "../../../error";

export async function logoutGET(
    apiImplementation: APIInterface,
    options: APIOptions,
    userContext: UserContext
): Promise<boolean> {
    if (apiImplementation.logoutGET === undefined) {
        return false;
    }

    let session;
    try {
        session = await Session.getSession(options.req, options.res, { sessionRequired: false }, userContext);
    } catch {
        session = undefined;
    }

    const logoutChallenge =
        options.req.getKeyValueFromQuery("logout_challenge") ?? options.req.getKeyValueFromQuery("logoutChallenge");

    if (logoutChallenge === undefined) {
        throw new SuperTokensError({
            type: SuperTokensError.BAD_INPUT_ERROR,
            message: "Missing input param: logoutChallenge",
        });
    }

    let response = await apiImplementation.logoutGET({
        options,
        logoutChallenge,
        session,
        userContext,
    });

    if ("redirectTo" in response) {
        options.res.original.redirect(response.redirectTo);
    } else {
        send200Response(options.res, response);
    }
    return true;
}

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

    send200Response(options.res, response);
    return true;
}
