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

import { getBackwardsCompatibleUserInfo, send200Response } from "../../../utils";
import { validateFormFieldsOrThrowError } from "./utils";
import { APIInterface, APIOptions } from "../";
import STError from "../error";
import { UserContext } from "../../../types";
import Session from "../../session";

export default async function signUpAPI(
    apiImplementation: APIInterface,
    tenantId: string,
    options: APIOptions,
    userContext: UserContext
): Promise<boolean> {
    // Logic as per https://github.com/supertokens/supertokens-node/issues/21#issuecomment-710423536

    if (apiImplementation.signUpPOST === undefined) {
        return false;
    }

    const requestBody = await options.req.getJSONBody();

    // step 1
    let formFields: {
        id: string;
        value: string;
    }[] = await validateFormFieldsOrThrowError(
        options.config.signUpFeature.formFields,
        requestBody.formFields,
        tenantId,
        userContext
    );

    let session = await Session.getSession(
        options.req,
        options.res,
        {
            sessionRequired: false,
            overrideGlobalClaimValidators: () => [],
        },
        userContext
    );

    if (session !== undefined) {
        tenantId = session.getTenantId();
    }

    let result = await apiImplementation.signUpPOST({
        formFields,
        tenantId,
        session,
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
            type: STError.FIELD_ERROR,
            payload: [
                {
                    id: "email",
                    error: "This email already exists. Please sign in instead.",
                },
            ],
            message: "Error in input formFields",
        });
    } else {
        send200Response(options.res, result);
    }
    return true;
}
