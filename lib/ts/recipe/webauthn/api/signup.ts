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

import {
    getBackwardsCompatibleUserInfo,
    getNormalisedShouldTryLinkingWithSessionUserFlag,
    send200Response,
} from "../../../utils";
import { validateWebauthnGeneratedOptionsIdOrThrowError, validateCredentialOrThrowError } from "./utils";
import { APIInterface, APIOptions } from "..";
import STError from "../error";
import { UserContext } from "../../../types";
import { AuthUtils } from "../../../authUtils";

export default async function signUpAPI(
    apiImplementation: APIInterface,
    tenantId: string,
    options: APIOptions,
    userContext: UserContext
): Promise<boolean> {
    if (apiImplementation.signUpPOST === undefined) {
        return false;
    }

    const requestBody = await options.req.getJSONBody();
    const webauthnGeneratedOptionsId = await validateWebauthnGeneratedOptionsIdOrThrowError(
        requestBody.webauthnGeneratedOptionsId
    );
    const credential = await validateCredentialOrThrowError(requestBody.credential);

    const shouldTryLinkingWithSessionUser = getNormalisedShouldTryLinkingWithSessionUserFlag(options.req, requestBody);

    const session = await AuthUtils.loadSessionInAuthAPIIfNeeded(
        options.req,
        options.res,
        shouldTryLinkingWithSessionUser,
        userContext
    );
    if (session !== undefined) {
        tenantId = session.getTenantId();
    }

    let result = await apiImplementation.signUpPOST({
        credential,
        webauthnGeneratedOptionsId,
        tenantId,
        session,
        shouldTryLinkingWithSessionUser,
        options,
        userContext: userContext,
    });
    if (result.status === "OK") {
        send200Response(options.res, {
            status: "OK",
            ...getBackwardsCompatibleUserInfo(options.req, result, userContext),
        });
    } else if (result.status === "GENERAL_ERROR") {
        send200Response(options.res, result);
    } else if (result.status === "EMAIL_ALREADY_EXISTS_ERROR") {
        throw new STError({
            type: STError.BAD_INPUT_ERROR,
            message: "This email already exists. Please sign in instead.",
        });
    } else {
        send200Response(options.res, result);
    }
    return true;
}
