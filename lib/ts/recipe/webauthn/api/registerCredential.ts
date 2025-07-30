/* Copyright (c) 2025, VRAI Labs and/or its affiliates. All rights reserved.
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
import { validateWebauthnGeneratedOptionsIdOrThrowError, validateCredentialOrThrowError } from "./utils";
import { APIInterface, APIOptions } from "..";
import { UserContext } from "../../../types";
import Session from "../../session";
import STError from "../../../error";

export default async function registerCredentialAPI(
    apiImplementation: APIInterface,
    tenantId: string,
    options: APIOptions,
    userContext: UserContext
): Promise<boolean> {
    if (apiImplementation.registerCredentialPOST === undefined) {
        return false;
    }

    const session = await Session.getSession(
        options.req,
        options.res,
        { overrideGlobalClaimValidators: () => [], sessionRequired: true },
        userContext
    );

    const requestBody = await options.req.getJSONBody();
    const webauthnGeneratedOptionsId = validateWebauthnGeneratedOptionsIdOrThrowError(
        requestBody.webauthnGeneratedOptionsId
    );
    const credential = validateCredentialOrThrowError(requestBody.credential);

    const recipeUserId = requestBody.recipeUserId;
    if (recipeUserId === undefined) {
        throw new STError({
            type: STError.BAD_INPUT_ERROR,
            message: "Please provide the recipeUserId",
        });
    }

    const result = await apiImplementation.registerCredentialPOST({
        recipeUserId,
        credential,
        webauthnGeneratedOptionsId,
        tenantId,
        options,
        userContext: userContext,
        session,
    });

    if (result.status === "OK") {
        send200Response(options.res, {
            status: "OK",
        });
    } else {
        send200Response(options.res, result);
    }

    return true;
}
