/* Copyright (c) 2023, VRAI Labs and/or its affiliates. All rights reserved.
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
import { validateFormFieldsOrThrowError } from "./utils";
import { APIInterface, APIOptions } from "..";
import { makeDefaultUserContextFromAPI } from "../../../utils";
import Session from "../../session";

export default async function linkAccountToExistingAccountAPI(
    apiImplementation: APIInterface,
    options: APIOptions
): Promise<boolean> {
    if (apiImplementation.linkAccountWithUserFromSessionPOST === undefined) {
        return false;
    }

    let formFields: {
        id: string;
        value: string;
    }[] = await validateFormFieldsOrThrowError(
        options.config.signUpFeature.formFields,
        (await options.req.getJSONBody()).formFields
    );

    let userContext = makeDefaultUserContextFromAPI(options.req);
    const session = await Session.getSession(
        options.req,
        options.res,
        { overrideGlobalClaimValidators: () => [] },
        userContext
    );
    let result = await apiImplementation.linkAccountWithUserFromSessionPOST({
        formFields,
        session: session,
        options,
        userContext,
    });
    // status: NEW_ACCOUNT_NEEDS_TO_BE_VERIFIED_ERROR | ACCOUNT_LINKING_NOT_ALLOWED_ERROR | WRONG_CREDENTIALS_ERROR | GENERAL_ERROR | "OK"
    send200Response(options.res, result);
    return true;
}
