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

export default async function signUpAPI(
    apiImplementation: APIInterface,
    tenantId: string,
    options: APIOptions,
    userContext: any
): Promise<boolean> {
    // Logic as per https://github.com/supertokens/supertokens-node/issues/21#issuecomment-710423536

    if (apiImplementation.signUpPOST === undefined) {
        return false;
    }

    // step 1
    let formFields: {
        id: string;
        value: string;
    }[] = await validateFormFieldsOrThrowError(
        options.config.signUpFeature.formFields,
        (await options.req.getJSONBody()).formFields,
        tenantId
    );

    let result = await apiImplementation.signUpPOST({
        formFields,
        tenantId,
        options,
        userContext: userContext,
    });
    if (result.status === "OK") {
        send200Response(options.res, {
            status: "OK",
            ...getBackwardsCompatibleUserInfo(options.req, result),
        });
    } else if (result.status === "GENERAL_ERROR") {
        send200Response(options.res, result);
    } else {
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
    }
    return true;
}
