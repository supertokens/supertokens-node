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
import STError from "../error";
import { APIInterface, APIOptions } from "..";
import { UserContext } from "../../../types";

export default async function registerOptions(
    apiImplementation: APIInterface,
    tenantId: string,
    options: APIOptions,
    userContext: UserContext
): Promise<boolean> {
    if (apiImplementation.registerOptionsPOST === undefined) {
        return false;
    }

    const requestBody = await options.req.getJSONBody();

    const email = requestBody.email?.trim();
    const recoverAccountToken = requestBody.recoverAccountToken;

    if (
        (email === undefined || typeof email !== "string") &&
        (recoverAccountToken === undefined || typeof recoverAccountToken !== "string")
    ) {
        throw new STError({
            type: STError.BAD_INPUT_ERROR,
            message: "Please provide the email or the recover account token",
        });
    }

    // same as for passwordless lib/ts/recipe/passwordless/api/createCode.ts
    if (email !== undefined) {
        const validateError = await options.config.validateEmailAddress(email, tenantId, userContext);
        if (validateError !== undefined) {
            send200Response(options.res, {
                status: "INVALID_EMAIL_ERROR",
                err: validateError,
            });
            return true;
        }
    }

    const result = await apiImplementation.registerOptionsPOST({
        email,
        recoverAccountToken,
        tenantId,
        options,
        userContext,
    });

    send200Response(options.res, result);
    return true;
}
