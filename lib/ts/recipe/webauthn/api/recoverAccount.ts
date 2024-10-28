/* Copyright (c) 2021, VRAI Labs and/or its affiliates. All rights reserved.
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
import { validateCredentialOrThrowError, validatewebauthnGeneratedOptionsIdOrThrowError } from "./utils";
import STError from "../error";
import { APIInterface, APIOptions } from "../";
import { UserContext } from "../../../types";

export default async function recoverAccount(
    apiImplementation: APIInterface,
    tenantId: string,
    options: APIOptions,
    userContext: UserContext
): Promise<boolean> {
    // Logic as per https://github.com/supertokens/supertokens-node/issues/22#issuecomment-710512442

    if (apiImplementation.recoverAccountTokenPOST === undefined) {
        return false;
    }

    const requestBody = await options.req.getJSONBody();
    let webauthnGeneratedOptionsId = await validatewebauthnGeneratedOptionsIdOrThrowError(
        requestBody.webauthnGeneratedOptionsId
    );
    let credential = await validateCredentialOrThrowError(requestBody.credential);
    let token = requestBody.token;

    if (token === undefined) {
        throw new STError({
            type: STError.BAD_INPUT_ERROR,
            message: "Please provide the account recovery token",
        });
    }
    if (typeof token !== "string") {
        throw new STError({
            type: STError.BAD_INPUT_ERROR,
            message: "The account recovery token must be a string",
        });
    }

    let result = await apiImplementation.recoverAccountTokenPOST({
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
