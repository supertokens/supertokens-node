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
import { validateFormFieldsOrThrowError } from "./utils";
import { APIInterface, APIOptions } from "../";
import { UserContext } from "../../../types";
import Session from "../../session";

export default async function generatePasswordResetToken(
    apiImplementation: APIInterface,
    tenantId: string,
    options: APIOptions,
    userContext: UserContext
): Promise<boolean> {
    // Logic as per https://github.com/supertokens/supertokens-node/issues/22#issuecomment-710512442

    if (apiImplementation.generatePasswordResetTokenPOST === undefined) {
        return false;
    }

    const requestBody = await options.req.getJSONBody();

    // step 1
    let formFields: {
        id: string;
        value: string;
    }[] = await validateFormFieldsOrThrowError(
        options.config.resetPasswordUsingTokenFeature.formFieldsForGenerateTokenForm,
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

    let result = await apiImplementation.generatePasswordResetTokenPOST({
        formFields,
        tenantId,
        session,
        options,
        userContext,
    });

    send200Response(options.res, result);
    return true;
}
