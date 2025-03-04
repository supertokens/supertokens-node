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
import { validateCredentialOrThrowError, validateWebauthnGeneratedOptionsIdOrThrowError } from "./utils";
import STError from "../error";
import { APIInterface, APIOptions } from "../";
import { UserContext } from "../../../types";

export default async function recoverAccount(
    apiImplementation: APIInterface,
    tenantId: string,
    options: APIOptions,
    userContext: UserContext
): Promise<boolean> {
    if (apiImplementation.recoverAccountPOST === undefined) {
        return false;
    }

    const requestBody = await options.req.getJSONBody();
    const webauthnGeneratedOptionsId = validateWebauthnGeneratedOptionsIdOrThrowError(
        requestBody.webauthnGeneratedOptionsId
    );

    const credential = validateCredentialOrThrowError(requestBody.credential);

    const token = requestBody.token;
    if (token === undefined) {
        throw new STError({
            type: STError.BAD_INPUT_ERROR,
            message: "Please provide the recover account token",
        });
    }
    if (typeof token !== "string") {
        throw new STError({
            type: STError.BAD_INPUT_ERROR,
            message: "The recover account token must be a string",
        });
    }

    const result = await apiImplementation.recoverAccountPOST({
        webauthnGeneratedOptionsId,
        credential,
        token,
        tenantId,
        options,
        userContext,
    });

    send200Response(
        options.res,
        result.status === "OK"
            ? {
                  status: "OK",
              }
            : result
    );
    return true;
}
