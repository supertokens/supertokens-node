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
import { validateWebauthnGeneratedOptionsIdOrThrowError, validateCredentialOrThrowError } from "./utils";
import { APIInterface, APIOptions } from "..";
import STError from "../error";
import { UserContext } from "../../../types";
import { AuthUtils } from "../../../authUtils";

export default async function registerCredentialAPI(
    apiImplementation: APIInterface,
    tenantId: string,
    options: APIOptions,
    userContext: UserContext
): Promise<boolean> {
    if (apiImplementation.registerCredentialPOST === undefined) {
        return false;
    }

    const requestBody = await options.req.getJSONBody();
    const webauthnGeneratedOptionsId = await validateWebauthnGeneratedOptionsIdOrThrowError(
        requestBody.webauthnGeneratedOptionsId
    );
    const credential = await validateCredentialOrThrowError(requestBody.credential);

    const session = await AuthUtils.loadSessionInAuthAPIIfNeeded(options.req, options.res, undefined, userContext);

    if (session === undefined) {
        throw new STError({
            type: STError.BAD_INPUT_ERROR,
            message: "A valid session is required to register a credential",
        });
    }

    let result = await apiImplementation.registerCredentialPOST({
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
    } else if (result.status === "GENERAL_ERROR") {
        send200Response(options.res, result);
    } else {
        send200Response(options.res, result);
    }

    return true;
}
