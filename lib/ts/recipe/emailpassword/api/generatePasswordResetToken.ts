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

    // step 1
    let formFields: {
        id: string;
        value: string;
    }[] = await validateFormFieldsOrThrowError(
        options.config.resetPasswordUsingTokenFeature.formFieldsForGenerateTokenForm,
        (await options.req.getJSONBody()).formFields,
        tenantId
    );

    let result = await apiImplementation.generatePasswordResetTokenPOST({
        formFields,
        tenantId,
        options,
        userContext,
    });

    send200Response(options.res, result);
    return true;
}
